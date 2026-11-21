// 전용 창 프로그램 (Little Light · Ghost 공용) — build_shell.ps1이 Config.cs(이름·포트·exe 패턴)와 함께 컴파일
//  켜면: 업데이트 확인(update.ps1) → ComfyUI(Comfy Desktop) 실행 → 같은 폴더의 최신 앱 exe를 창 없이 실행(-port N -no-browser)
//        → WebView2 창에 앱 화면. 창을 닫으면 직접 켠 앱 서버도 끔
//  WebView2 부품(Core · WinForms · Loader)은 exe 안에 들어 있고 처음 켤 때 %LOCALAPPDATA%\<Id>\shell\ 에 풀림
//  C# 5 문법만 씀 (Windows 기본 csc.exe로 빌드)
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

static class Program
{
    public static string Home;      // 이 exe가 있는 폴더
    public static string Local;     // %LOCALAPPDATA%\<Id>
    public static string LibDir;    // 풀어 둔 WebView2 부품

    [STAThread]
    static void Main()
    {
        // 시험용: --port N 으로 포트 바꾸기 (사용자가 쓰는 포트와 겹치지 않게)
        var a = Environment.GetCommandLineArgs();
        for (int i = 1; i + 1 < a.Length; i++) if (a[i] == "--port") { int p; if (int.TryParse(a[i + 1], out p)) Config.Port = p; }
        Home = Path.GetDirectoryName(Application.ExecutablePath);
        Local = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), Config.Id);
        Directory.CreateDirectory(Local);
        // 업데이트 때 이름이 바뀐 예전 실행 파일(*.old) 정리
        try { foreach (var f in Directory.GetFiles(Home, "*.old")) { try { File.Delete(f); } catch { } } } catch { }
        bool fresh;
        var mtx = new Mutex(true, "Local\\AppShell_" + Config.Id + "_" + Config.Port, out fresh);
        if (!fresh) { Activate(); return; }
        LibDir = ExtractLibs();
        AppDomain.CurrentDomain.AssemblyResolve += (s, e) =>
        {
            var n = new AssemblyName(e.Name).Name + ".dll";
            var p = Path.Combine(LibDir, n);
            return File.Exists(p) ? Assembly.LoadFrom(p) : null;
        };
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Run();
        GC.KeepAlive(mtx);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static void Run() { Application.Run(new ShellForm()); }   // WebView2 형식은 부품을 찾을 수 있게 된 뒤에 불러옴

    static string ExtractLibs()
    {
        var asm = Assembly.GetExecutingAssembly();
        var ver = asm.GetName().Version.ToString();
        var dir = Path.Combine(Local, "shell", ver);
        Directory.CreateDirectory(dir);
        foreach (var name in new[] { "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll" })
        {
            var dst = Path.Combine(dir, name);
            using (var s = asm.GetManifestResourceStream(name))
            {
                if (s == null) continue;
                if (File.Exists(dst) && new FileInfo(dst).Length == s.Length) continue;
                using (var f = File.Create(dst)) s.CopyTo(f);
            }
        }
        return dir;
    }

    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
    static void Activate()
    {
        var me = Process.GetCurrentProcess();
        foreach (var p in Process.GetProcessesByName(me.ProcessName))
        {
            if (p.Id == me.Id || p.MainWindowHandle == IntPtr.Zero) continue;
            ShowWindow(p.MainWindowHandle, 9); SetForegroundWindow(p.MainWindowHandle); return;
        }
    }
}

class ShellForm : Form
{
    Microsoft.Web.WebView2.WinForms.WebView2 web;
    Label status;
    Process server;          // 이 창이 직접 켠 앱 서버 (닫을 때 끔)
    bool closing;
    string Url { get { return "http://127.0.0.1:" + Config.Port + "/"; } }
    string BoundsFile { get { return Path.Combine(Program.Local, "window.txt"); } }

    public ShellForm()
    {
        Text = Config.Name;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        BackColor = Color.FromArgb(28, 28, 30);
        StartPosition = FormStartPosition.Manual;
        LoadBounds();
        status = new Label { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter, ForeColor = Color.Gainsboro, Font = new Font("Malgun Gothic", 12f), Text = Config.Name + " 준비 중…" };
        Controls.Add(status);
        Shown += async (s, e) => { await Startup(); };
        FormClosing += OnClosing;
    }

    void Say(string t) { if (!IsDisposed) BeginInvoke((Action)(() => { status.Text = t; })); }

    static void Log(string t) { try { File.AppendAllText(Path.Combine(Program.Local, "shell.log"), DateTime.Now.ToString("MM-dd HH:mm:ss ") + t + Environment.NewLine); } catch { } }

    async Task Startup()
    {
        Log("시작 " + Application.ExecutablePath + " port " + Config.Port);
        try { Microsoft.Web.WebView2.Core.CoreWebView2Environment.SetLoaderDllFolderPath(Program.LibDir); } catch (Exception ex) { Log("loader: " + ex.Message); }
        // 1. 업데이트 확인 (배포용 폴더: update.ps1 + update.txt)
        var up = Path.Combine(Program.Home, "update.ps1");
        if (File.Exists(up) && File.Exists(Path.Combine(Program.Home, "update.txt")))
        {
            Say("업데이트 확인 중…");
            await Task.Run(() => RunWait("powershell.exe", "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + up + "\"", 600000));
        }
        // 2. WebView2 런타임
        string rt = null;
        try { rt = Microsoft.Web.WebView2.Core.CoreWebView2Environment.GetAvailableBrowserVersionString(); } catch (Exception ex) { Log("runtime: " + ex.Message); }
        Log("WebView2 런타임 " + rt);
        if (string.IsNullOrEmpty(rt))
        {
            if (MessageBox.Show(this, "이 PC에 Microsoft Edge WebView2 런타임이 없습니다.\n받는 페이지를 열까요? (설치 후 다시 실행)\n\n아니요를 누르면 기본 브라우저로 엽니다.", Config.Name, MessageBoxButtons.YesNo, MessageBoxIcon.Warning) == DialogResult.Yes)
                Open("https://go.microsoft.com/fwlink/p/?LinkId=2124703");
            else if (await StartServer()) Open(Url);
            Close(); return;
        }
        // 3. ComfyUI
        if (!await Ok("http://127.0.0.1:8188/system_stats"))
        {
            var comfy = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Comfy Desktop", "Comfy Desktop.exe");
            if (File.Exists(comfy))
            {
                Say("ComfyUI 켜는 중… (처음엔 몇 분 걸릴 수 있음)");
                try { Process.Start(comfy); } catch { }
                for (int i = 0; i < 240 && !closing; i++) { if (await Ok("http://127.0.0.1:8188/system_stats")) break; await Task.Delay(1000); }
            }
        }
        if (closing) return;
        // 4. 앱 서버
        if (!await StartServer()) return;
        // 5. 창에 화면
        Say("화면 여는 중…");
        try
        {
            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, Path.Combine(Program.Local, "WebView2"));
            web = new Microsoft.Web.WebView2.WinForms.WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(28, 28, 30) };
            Controls.Add(web); web.BringToFront();
            await web.EnsureCoreWebView2Async(env);
            var cw = web.CoreWebView2;
            cw.Settings.IsStatusBarEnabled = false;
            cw.DocumentTitleChanged += (s, e) => { Text = string.IsNullOrEmpty(cw.DocumentTitle) ? Config.Name : cw.DocumentTitle; };
            // 새 창 링크(다운로드 · 바뀐 점 · 견본 크게 보기 등)는 기본 브라우저로
            cw.NewWindowRequested += (s, e) => { e.Handled = true; Open(e.Uri); };
            web.KeyDown += (s, e) => { if (e.KeyCode == Keys.F5) cw.Reload(); };
            cw.Navigate(Url);
            status.Visible = false; Log("화면 " + Url);
        }
        catch (Exception ex)
        {
            Log("화면 실패: " + ex);
            MessageBox.Show(this, "화면을 열지 못했습니다: " + ex.Message + "\n기본 브라우저로 엽니다.", Config.Name, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            Open(Url); Close();
        }
    }

    async Task<bool> StartServer()
    {
        if (await Ok(Url + "api/config")) return true;          // 이미 켜져 있으면 그대로 씀 (닫을 때 끄지 않음)
        var exe = Config.Embedded ? PrepareEngine() : Directory.GetFiles(Program.Home, "*.exe")
            .Select(f => new { f, m = Regex.Match(Path.GetFileName(f), Config.ExePattern, RegexOptions.IgnoreCase) })
            .Where(x => x.m.Success)
            .OrderBy(x => new Version(x.m.Groups[1].Value.Split('.').Length == 1 ? x.m.Groups[1].Value + ".0" : x.m.Groups[1].Value))
            .Select(x => x.f).LastOrDefault();
        if (exe == null)
        {
            MessageBox.Show(this, (Config.Embedded ? "앱을 준비하지 못했습니다. 폴더에 쓰기 권한이 있는지 확인하세요 (기록: %LOCALAPPDATA%\\" + Config.Id + "\\shell.log)." : "이 폴더에서 " + Config.Name + " 실행 파일(" + Config.ExeHint + ")을 찾지 못했습니다."), Config.Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close(); return false;
        }
        Say(Path.GetFileNameWithoutExtension(exe) + " 켜는 중…"); Log("서버 " + exe);
        try
        {
            server = Process.Start(new ProcessStartInfo(exe, "-port " + Config.Port + " -no-browser") { WorkingDirectory = Program.Home, UseShellExecute = false, CreateNoWindow = true });
        }
        catch (Exception ex) { MessageBox.Show(this, "실행하지 못했습니다: " + ex.Message, Config.Name); Close(); return false; }
        for (int i = 0; i < 60; i++)
        {
            if (await Ok(Url + "api/config")) return true;
            if (server.HasExited) break;
            await Task.Delay(500);
        }
        MessageBox.Show(this, Path.GetFileName(exe) + "이(가) 시작되지 않았습니다.\n포트 " + Config.Port + "를 다른 프로그램이 쓰고 있는지 확인하세요.", Config.Name, MessageBoxButtons.OK, MessageBoxIcon.Error);
        Close(); return false;
    }

    // 배포용: 엔진(앱 서버 exe)이 이 exe 안에 들어 있음 → 같은 폴더의 숨김 폴더 .engine 에 풀어서 실행
    //  엔진은 자기 exe 옆을 데이터 폴더로 쓰므로 .engine\<데이터 폴더>를 이 폴더의 <데이터 폴더>로 잇는 연결(정션)을 만듦
    //  → 프리셋 · 기록 · 설정은 지금처럼 이 폴더의 데이터 폴더에 쌓임
    string PrepareEngine()
    {
        try
        {
            var dir = Path.Combine(Program.Home, ".engine");
            var di = Directory.CreateDirectory(dir);
            di.Attributes |= FileAttributes.Hidden;
            var exe = Path.Combine(dir, Config.EngineFile);
            using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("engine.exe"))
            {
                if (s == null) throw new Exception("exe 안에 엔진이 없습니다");
                // 빌드마다 바뀌는 번호(MVID)를 stamp에 적어 둠 → 크기가 같은 새 엔진도 확실히 바꿔 넣음
                var stampFile = Path.Combine(dir, "stamp");
                var stamp = Assembly.GetExecutingAssembly().ManifestModule.ModuleVersionId.ToString();
                var oldStamp = File.Exists(stampFile) ? File.ReadAllText(stampFile).Trim() : "";
                if (!File.Exists(exe) || new FileInfo(exe).Length != s.Length || oldStamp != stamp)
                {
                    Say("처음 실행 준비 중…");
                    using (var f = File.Create(exe)) s.CopyTo(f);
                    File.WriteAllText(stampFile, stamp);
                }
            }
            foreach (var old in Directory.GetFiles(dir, "*.exe")) if (!string.Equals(old, exe, StringComparison.OrdinalIgnoreCase)) { try { File.Delete(old); } catch { } }   // 예전 엔진
            if (Config.CleanOld) foreach (var old in Directory.GetFiles(Program.Home, "*.exe"))   // 배포용: 예전 방식(엔진이 폴더에 따로 있던 것) 정리
                if (Regex.IsMatch(Path.GetFileName(old), Config.ExePattern, RegexOptions.IgnoreCase)) { try { File.Delete(old); } catch { } }
            var data = Path.Combine(Program.Home, Config.DataName);
            Directory.CreateDirectory(data);
            var link = Path.Combine(dir, Config.DataName);
            if (!Directory.Exists(link))
                RunWait("cmd.exe", "/c mklink /J \"" + link + "\" \"" + data + "\"", 10000);
            if (!Directory.Exists(link)) Log("데이터 폴더 연결 실패: " + link);
            return exe;
        }
        catch (Exception ex) { Log("엔진 준비 실패: " + ex); return null; }
    }
    static async Task<bool> Ok(string url)
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create(url); req.Timeout = 2000; req.Proxy = null;
            using (var r = (HttpWebResponse)await req.GetResponseAsync()) return (int)r.StatusCode < 400;
        }
        catch { return false; }
    }
    static void RunWait(string file, string args, int ms)
    {
        try { using (var p = Process.Start(new ProcessStartInfo(file, args) { UseShellExecute = false, CreateNoWindow = true })) p.WaitForExit(ms); } catch { }
    }
    static void Open(string url) { try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { } }

    void OnClosing(object s, FormClosingEventArgs e)
    {
        closing = true;
        SaveBounds();
        try { if (server != null && !server.HasExited) { server.Kill(); server.WaitForExit(3000); } } catch { }
    }
    void LoadBounds()
    {
        Size = new Size(1360, 900); var wa = Screen.PrimaryScreen.WorkingArea;
        Location = new Point(wa.Left + Math.Max(0, (wa.Width - Width) / 2), wa.Top + Math.Max(0, (wa.Height - Height) / 2));
        try
        {
            var v = File.ReadAllText(BoundsFile).Split(',').Select(int.Parse).ToArray();
            var r = new Rectangle(v[0], v[1], v[2], v[3]);
            if (Screen.AllScreens.Any(sc => sc.WorkingArea.IntersectsWith(r)) && r.Width > 400 && r.Height > 300) { Location = r.Location; Size = r.Size; }
            if (v.Length > 4 && v[4] == 1) WindowState = FormWindowState.Maximized;
        }
        catch { }
    }
    void SaveBounds()
    {
        try
        {
            var r = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
            File.WriteAllText(BoundsFile, string.Join(",", r.X, r.Y, r.Width, r.Height, WindowState == FormWindowState.Maximized ? 1 : 0));
        }
        catch { }
    }
}
