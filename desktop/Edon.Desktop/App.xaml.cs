using System.Windows;
namespace Edon.Desktop;
public partial class App : Application {
 protected override void OnStartup(StartupEventArgs e) {
  base.OnStartup(e);
  if(e.Args.Contains("--self-test")) { try { SelfTest.Run(); Shutdown(0); } catch(Exception ex) { System.IO.File.WriteAllText("desktop-test-error.txt",ex.ToString()); Shutdown(1); } return; }
  var window = new MainWindow(); MainWindow = window; window.Show();
  var file = e.Args.FirstOrDefault(a => a.EndsWith(".edonn",StringComparison.OrdinalIgnoreCase));
  if(file != null) window.OpenPath(file);
 }
}
