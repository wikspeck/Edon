using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
namespace Edon.Desktop;
public static class Renderer {
 public static Brush Color(string color) { try { return (Brush)new BrushConverter().ConvertFromString(color)!; } catch { return Brushes.Gray; } }
 public static FrameworkElement Element(Layer l) {
  FrameworkElement visual;
  if(l.Type == "Image") {
   var image = new BitmapImage(); image.BeginInit(); image.CacheOption = BitmapCacheOption.OnLoad; image.StreamSource = new MemoryStream(Convert.FromBase64String(l.Image)); image.EndInit(); image.Freeze();
   visual = new Image { Source=image, Stretch=Stretch.Fill };
  } else if(l.Type == "Text") visual = new TextBlock { Text=l.Text, FontFamily=new FontFamily(l.Font), FontSize=l.FontSize, FontWeight=l.Bold ? FontWeights.Bold : FontWeights.Normal, FontStyle=l.Italic ? FontStyles.Italic : FontStyles.Normal, Foreground=Color(l.Fill), TextWrapping=TextWrapping.Wrap };
  else if(l.Type == "Brush") {
   var line = new Polyline {Stroke=Color(l.Fill),StrokeThickness=l.StrokeWidth,StrokeStartLineCap=PenLineCap.Round,StrokeEndLineCap=PenLineCap.Round,StrokeLineJoin=PenLineJoin.Round};
   for(int i=0;i+1<l.Points.Count;i+=2) line.Points.Add(new Point(l.Points[i],l.Points[i+1]));
   visual=line;
  } else if(l.Type == "Ellipse") visual=new Ellipse{Fill=Color(l.Fill)};
  else visual=new Rectangle{Fill=Color(l.Fill)};
  visual.Width=l.Width; visual.Height=l.Height; visual.Opacity=Math.Clamp(l.Opacity,0,1); visual.Tag=l.Id;
  Canvas.SetLeft(visual,l.X); Canvas.SetTop(visual,l.Y); return visual;
 }
 public static Canvas Page(Page page) {
  var canvas = new Canvas{Width=page.Width,Height=page.Height,Background=Color(page.Background),ClipToBounds=true};
  foreach(var l in page.Elements.Where(l=>l.Visible)) canvas.Children.Add(Element(l));
  canvas.Measure(new Size(page.Width,page.Height)); canvas.Arrange(new Rect(0,0,page.Width,page.Height)); canvas.UpdateLayout(); return canvas;
 }
 public static void ExportPng(Page page,string path) {
  var bitmap=new RenderTargetBitmap(page.Width,page.Height,96,96,PixelFormats.Pbgra32); bitmap.Render(Page(page));
  var encoder=new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(bitmap)); using var stream=File.Create(path); encoder.Save(stream);
 }
}
