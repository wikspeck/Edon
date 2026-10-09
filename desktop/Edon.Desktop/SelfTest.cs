using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media.Imaging;
namespace Edon.Desktop;
internal static class SelfTest {
 public static void Run() {
  var folder=Path.Combine(Path.GetTempPath(),"edon-native-test-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(folder);
  var project=new Project{Name="Roundtrip",Pages=[new(){Width=320,Height=200,Elements=[new(){X=10,Y=10,Width=100,Height=50,Fill="#DE765D"},new(){Type="Text",X=20,Y=70,Width=220,Height=60,Text="Edon",FontSize=32},new(){Type="Brush",X=30,Y=140,Width=120,Height=30,Points=[0,0,100,20]}]}]};
  string file=Path.Combine(folder,"roundtrip.edonn");project.Save(file);var loaded=Project.Load(file);
  if(loaded.Pages[0].Elements.Count!=3 || loaded.Pages[0].Elements[1].Text!="Edon")throw new Exception("Serialization mismatch.");
  string png=Path.Combine(folder,"export.png");Renderer.ExportPng(loaded.Pages[0],png);
  var bitmap=new BitmapImage(new Uri(png));if(bitmap.PixelWidth!=320 || bitmap.PixelHeight!=200)throw new Exception("Export dimensions.");
  var pixels=new byte[4];new System.Windows.Media.Imaging.CroppedBitmap(bitmap,new Int32Rect(20,20,1,1)).CopyPixels(pixels,4,0);
  if(pixels[2]<180 || pixels[1]>160)throw new Exception("PNG does not contain the expected filled shape.");
  var doc=new RichTextBox();doc.Document.Blocks.Add(new Paragraph(new Run("Formatted document"){FontWeight=FontWeights.Bold,FontSize=24}));
  using var stream=new MemoryStream();new TextRange(doc.Document.ContentStart,doc.Document.ContentEnd).Save(stream,DataFormats.XamlPackage);stream.Position=0;
  var restored=new RichTextBox();new TextRange(restored.Document.ContentStart,restored.Document.ContentEnd).Load(stream,DataFormats.XamlPackage);
  if(!new TextRange(restored.Document.ContentStart,restored.Document.ContentEnd).Text.Contains("Formatted document"))throw new Exception("Rich text roundtrip.");
  var invalid=Path.Combine(folder,"invalid.edonn");File.WriteAllText(invalid,"{\"Version\":99}");
  try {Project.Load(invalid);throw new Exception("Invalid version accepted.");}catch(InvalidDataException){}
  var window=new MainWindow();window.Measure(new Size(1440,920));window.Arrange(new Rect(0,0,1440,920));window.UpdateLayout();
  var root=(FrameworkElement)window.Content;root.Measure(new Size(1440,920));root.Arrange(new Rect(0,0,1440,920));root.UpdateLayout();
  var shot=new RenderTargetBitmap(1440,920,96,96,System.Windows.Media.PixelFormats.Pbgra32);shot.Render(root);
  var encoder=new PngBitmapEncoder();encoder.Frames.Add(BitmapFrame.Create(shot));using(var output=File.Create(Path.Combine(folder,"native-preview.png")))encoder.Save(output);
  File.WriteAllText("desktop-test-result.json",System.Text.Json.JsonSerializer.Serialize(new{passed=true,checks=new[]{"project roundtrip","PNG dimensions and filled pixel","rich text roundtrip","invalid version rejected","WPF window layout"},artifacts=folder}));
 }
}
