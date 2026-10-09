using System.IO;
using System.Text.Json;
namespace Edon.Desktop;
public sealed class Project {
 public int Version {get;set;} = 1;
 public string Name {get;set;} = "Untitled";
 public string Kind {get;set;} = "Canvas";
 public List<Page> Pages {get;set;} = [new()];
 public static Project Load(string path) {
  var p = JsonSerializer.Deserialize<Project>(File.ReadAllText(path)) ?? throw new InvalidDataException("Empty project.");
  if(p.Version != 1 || p.Pages.Count == 0 || p.Pages.Count > 300 || !new[]{"Canvas","Document","Presentation"}.Contains(p.Kind)) throw new InvalidDataException("Unsupported Edon native project.");
  foreach(var page in p.Pages) {
   if(page.Width < 64 || page.Height < 64 || page.Width > 8192 || page.Height > 8192 || page.Elements.Count > 10000) throw new InvalidDataException("Invalid page dimensions or layer count.");
   foreach(var item in page.Elements) if(!double.IsFinite(item.X) || !double.IsFinite(item.Y) || !double.IsFinite(item.Width) || !double.IsFinite(item.Height) || item.Width <= 0 || item.Height <= 0 || item.Points.Any(v => !double.IsFinite(v))) throw new InvalidDataException("Invalid layer geometry.");
  }
  return p;
 }
 public void Save(string path) { var temp = path + ".tmp"; File.WriteAllText(temp,Serialize()); File.Move(temp,path,true); }
 public string Serialize() => JsonSerializer.Serialize(this);
 public static Project Deserialize(string json) => JsonSerializer.Deserialize<Project>(json)!;
}
public sealed class Page {
 public string Name {get;set;} = "Page 1";
 public int Width {get;set;} = 1280; public int Height {get;set;} = 720;
 public string Background {get;set;} = "#F4F3EE";
 public string Document {get;set;} = "";
 public List<Layer> Elements {get;set;} = [];
}
public sealed class Layer {
 public string Id {get;set;} = Guid.NewGuid().ToString("N");
 public string Type {get;set;} = "Rectangle"; public string Name {get;set;} = "Rectangle";
 public double X {get;set;} public double Y {get;set;}
 public double Width {get;set;} = 180; public double Height {get;set;} = 120;
 public string Fill {get;set;} = "#899978"; public double Opacity {get;set;} = 1;
 public string Text {get;set;} = "Your next idea"; public string Font {get;set;} = "Segoe UI"; public double FontSize {get;set;} = 36;
 public bool Bold {get;set;} public bool Italic {get;set;}
 public string Image {get;set;} = ""; public bool Visible {get;set;} = true;
 public List<double> Points {get;set;} = []; public double StrokeWidth {get;set;} = 8;
}
