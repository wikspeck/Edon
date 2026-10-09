using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using Microsoft.Win32;
namespace Edon.Desktop;
public partial class MainWindow : Window {
 internal Project Project = new();
 int pageIndex;
 Layer? selected;
 string tool="Select", path="";
 bool updating, dirty, drawing;
 Point start, original;
 string gestureSnapshot="";
 readonly Stack<string> undo=new(), redo=new();
 readonly string store=System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Edon","Native");
 readonly DispatcherTimer autosave=new(){Interval=TimeSpan.FromSeconds(15)};
 Page Current => Project.Pages[pageIndex];
 public MainWindow() {
  InitializeComponent();
  Directory.CreateDirectory(store);
  foreach(var color in new[]{"#20211F","#F4F3EE","#899978","#D5C087","#DE765D","#7B99B3","#AF8BB1"}) {
   var b=new Button{Width=25,Height=25,Padding=new Thickness(0),Background=Renderer.Color(color),ToolTip=color};
   b.Click+=(_,_)=>SetColor(color); Swatches.Children.Add(b);
  }
  PreviewKeyDown+=Keys;
  AllowDrop=true; DragOver+=(_,e)=>{e.Effects=e.Data.GetDataPresent(DataFormats.FileDrop)?DragDropEffects.Copy:DragDropEffects.None; e.Handled=true;};
  Drop+=(_,e)=> { if(e.Data.GetData(DataFormats.FileDrop) is string[] files) foreach(var file in files) { if(file.EndsWith(".edonn",StringComparison.OrdinalIgnoreCase)) OpenPath(file); else ImportImage(file); } };
  Closing+=(_,e)=> { FinishGesture(); FlushDocument(); if(!ConfirmLeave()) {e.Cancel=true;return;} autosave.Stop(); };
  autosave.Tick+=(_,_)=> { if(!dirty || drawing) return; try { FlushDocument(); Project.Save(System.IO.Path.Combine(store,"recovery.edonn")); Status.Text="Recovery saved locally · "+DateTime.Now.ToString("HH:mm"); } catch(Exception ex) { Status.Text="Recovery failed: "+ex.Message; } };
  autosave.Start();
  Refresh();
  Loaded+=(_,_)=> {
   Fit();
   var recovery=System.IO.Path.Combine(store,"recovery.edonn");
   if(File.Exists(recovery) && MessageBox.Show(this,"A local recovery project is available. Restore it?","Edon",MessageBoxButton.YesNo)==MessageBoxResult.Yes) LoadProject(recovery,false);
   var animation=new DoubleAnimation(0,1,TimeSpan.FromMilliseconds(220)); if(SystemParameters.ClientAreaAnimation) BeginAnimation(OpacityProperty,animation);
  };
 }
 void Fit() { Zoom.Value=Math.Clamp(Math.Min((CanvasScroll.ActualWidth-100)/Current.Width,(CanvasScroll.ActualHeight-100)/Current.Height)*100,10,150); }
 void FitClick(object sender,RoutedEventArgs e)=>Fit();
 void ZoomChanged(object sender,RoutedPropertyChangedEventArgs<double> e) { if(Artboard!=null)Artboard.LayoutTransform=new ScaleTransform(e.NewValue/100,e.NewValue/100);if(ZoomLabel!=null)ZoomLabel.Text=e.NewValue.ToString("0")+"%"; }
 void Guard(Action work) { try {work();} catch(Exception ex) { MessageBox.Show(this,ex.Message,"Edon",MessageBoxButton.OK,MessageBoxImage.Warning); } }
 bool ConfirmLeave() => !dirty || MessageBox.Show(this,"Save your changes before continuing?","Edon",MessageBoxButton.YesNoCancel) switch { MessageBoxResult.Yes => Save(false),MessageBoxResult.No => true,_ => false };
 void Mark() { dirty=true; Title=Project.Name+" * — Edon"; Status.Text="Unsaved changes · recovery every 15 seconds"; }
 void Snapshot() { FlushDocument(); undo.Push(Project.Serialize()); if(undo.Count>100) { var recent=undo.Take(100).Reverse().ToArray(); undo.Clear(); foreach(var item in recent) undo.Push(item); } redo.Clear(); }
 void Commit(Action edit) { Snapshot(); edit(); Mark(); RefreshCanvas(); }
 void FlushDocument() {
  if(updating || DocumentEditor == null || Project.Kind!="Document") return;
  using var stream=new MemoryStream(); new TextRange(DocumentEditor.Document.ContentStart,DocumentEditor.Document.ContentEnd).Save(stream,DataFormats.XamlPackage);
  Current.Document=Convert.ToBase64String(stream.ToArray());
 }
 void Refresh() {
  updating=true;
  ProjectName.Text=Project.Name; KindLabel.Text=Project.Kind+" / "+Project.Pages.Count+" pages";
  PagesList.Items.Clear(); foreach(var p in Project.Pages) PagesList.Items.Add(p.Name);
  PagesList.SelectedIndex=pageIndex;
  DocumentEditor.Visibility=Project.Kind=="Document"?Visibility.Visible:Visibility.Collapsed;
  CanvasScroll.Visibility=Project.Kind=="Document"?Visibility.Collapsed:Visibility.Visible;
  if(Project.Kind=="Document") {
   DocumentEditor.Document=new FlowDocument{PageWidth=794,FontFamily=new FontFamily("Segoe UI"),FontSize=16};
   if(Current.Document.Length>0) { using var stream=new MemoryStream(Convert.FromBase64String(Current.Document)); new TextRange(DocumentEditor.Document.ContentStart,DocumentEditor.Document.ContentEnd).Load(stream,DataFormats.XamlPackage); }
  }
  updating=false; RefreshCanvas();
 }
 void RefreshCanvas() {
  updating=true;
  Artboard.Children.Clear(); Artboard.Width=Current.Width; Artboard.Height=Current.Height; Artboard.Background=Renderer.Color(Current.Background);
  foreach(var l in Current.Elements.Where(l=>l.Visible)) Artboard.Children.Add(Renderer.Element(l));
  if(selected != null && Current.Elements.Contains(selected)) {
   var outline=new Rectangle{Width=selected.Width+6,Height=selected.Height+6,Stroke=Renderer.Color("#899978"),StrokeThickness=2,Fill=Brushes.Transparent,IsHitTestVisible=false};
   Canvas.SetLeft(outline,selected.X-3); Canvas.SetTop(outline,selected.Y-3); Artboard.Children.Add(outline);
   SelectionLabel.Text=selected.Name; ColorInput.Text=selected.Fill; OpacityInput.Value=selected.Opacity; WidthInput.Text=selected.Width.ToString("0.##"); HeightInput.Text=selected.Height.ToString("0.##"); LayerTextInput.Text=selected.Text;
   FontButton.Content=selected.Font+" ▾"; SizeButton.Content=selected.FontSize+" px ▾";
  } else { selected=null; SelectionLabel.Text="Select a layer"; WidthInput.Text=""; HeightInput.Text=""; LayerTextInput.Text=""; }
  LayersList.Items.Clear(); foreach(var l in Current.Elements.AsEnumerable().Reverse()) { LayersList.Items.Add(new ListBoxItem{Content=(l.Visible?"":"◌ ")+l.Name,Tag=l.Id}); }
  if(selected!=null) foreach(ListBoxItem item in LayersList.Items) if((string)item.Tag==selected.Id) LayersList.SelectedItem=item;
  updating=false;
 }
 void NameChanged(object sender,TextChangedEventArgs e) { if(updating || ProjectName==null) return; Project.Name=ProjectName.Text; Mark(); }
 void DocumentChanged(object sender,TextChangedEventArgs e) { if(!updating && Project.Kind=="Document") Mark(); }
 void NewClick(object sender,RoutedEventArgs e) {
  FinishGesture(); FlushDocument(); if(!ConfirmLeave())return;
  Project=new(){Kind=(string)((Button)sender).Tag}; if(Project.Kind=="Document") {Project.Pages[0].Width=794;Project.Pages[0].Height=1123;}
  path=""; pageIndex=0; selected=null; undo.Clear();redo.Clear();dirty=false; Title="Edon — Creative workspace"; Refresh();
 }
 void OpenClick(object sender,RoutedEventArgs e) { var dialog=new OpenFileDialog{Filter="Edon native projects (*.edonn)|*.edonn"}; if(dialog.ShowDialog(this)==true) OpenPath(dialog.FileName); }
 public void OpenPath(string file) { FinishGesture(); FlushDocument(); if(ConfirmLeave()) LoadProject(file,true); }
 void LoadProject(string file,bool remember) { Guard(()=>{var loaded=Project.Load(file); Project=loaded;path=remember?file:"";pageIndex=0;selected=null;dirty=!remember;undo.Clear();redo.Clear();Refresh();Title=Project.Name+" — Edon";if(remember)Remember(file);}); }
 void Remember(string file) { var history=System.IO.Path.Combine(store,"recent.txt");var items=File.Exists(history)?File.ReadAllLines(history):[];File.WriteAllLines(history,new[]{file}.Concat(items.Where(f=>f!=file)).Take(12)); }
 void RecentClick(object sender,RoutedEventArgs e) {
  var menu=new ContextMenu(); var history=System.IO.Path.Combine(store,"recent.txt");
  if(File.Exists(history)) foreach(var file in File.ReadAllLines(history).Where(File.Exists)) { var item=new MenuItem{Header=System.IO.Path.GetFileNameWithoutExtension(file),ToolTip=file};item.Click+=(_,_)=>OpenPath(file);menu.Items.Add(item); }
  if(menu.Items.Count==0) menu.Items.Add(new MenuItem{Header="No saved projects yet",IsEnabled=false});
  menu.PlacementTarget=(Button)sender;menu.IsOpen=true;
 }
 bool Save(bool saveAs) {
  FinishGesture();FlushDocument();
  if(path=="" || saveAs) { var dialog=new SaveFileDialog{Filter="Edon native project (*.edonn)|*.edonn",FileName=Project.Name+".edonn"};if(dialog.ShowDialog(this)!=true)return false;path=dialog.FileName; }
  try {Project.Save(path);Remember(path);dirty=false;Title=Project.Name+" — Edon";Status.Text="Saved · "+path;File.Delete(System.IO.Path.Combine(store,"recovery.edonn"));return true;} catch(Exception ex){MessageBox.Show(this,ex.Message,"Save failed");return false;}
 }
 void SaveClick(object sender,RoutedEventArgs e)=>Save(false);
 void ExportClick(object sender,RoutedEventArgs e) {
  FlushDocument();
  if(Project.Kind=="Document") { var dialog=new SaveFileDialog{Filter="Rich text (*.rtf)|*.rtf|Plain text (*.txt)|*.txt",FileName=Project.Name+".rtf"};if(dialog.ShowDialog(this)==true)Guard(()=>{using var stream=File.Create(dialog.FileName);new TextRange(DocumentEditor.Document.ContentStart,DocumentEditor.Document.ContentEnd).Save(stream,dialog.FilterIndex==1?DataFormats.Rtf:DataFormats.Text);Status.Text="Document exported";});return; }
  var d=new SaveFileDialog{Filter="PNG image (*.png)|*.png",FileName=Project.Name+".png"};if(d.ShowDialog(this)==true)Guard(()=>{Renderer.ExportPng(Current,d.FileName);Status.Text="Page exported as PNG";});
 }
 void PrintClick(object sender,RoutedEventArgs e) {
  Guard(()=>{var dialog=new PrintDialog();if(dialog.ShowDialog()==true) {FlushDocument(); if(Project.Kind=="Document") {var document=new FlowDocument();using var stream=new MemoryStream(Convert.FromBase64String(Current.Document));new TextRange(document.ContentStart,document.ContentEnd).Load(stream,DataFormats.XamlPackage);dialog.PrintDocument(((IDocumentPaginatorSource)document).DocumentPaginator,Project.Name);} else {var doc=new FixedDocument(); foreach(var p in Project.Pages) {var fixedPage=new FixedPage{Width=p.Width,Height=p.Height};fixedPage.Children.Add(Renderer.Page(p));var content=new PageContent();((System.Windows.Markup.IAddChild)content).AddChild(fixedPage);doc.Pages.Add(content);} dialog.PrintDocument(doc.DocumentPaginator,Project.Name);}}});
 }
 void PageChanged(object sender,SelectionChangedEventArgs e) { if(updating || PagesList.SelectedIndex<0)return;FinishGesture();FlushDocument();pageIndex=PagesList.SelectedIndex;selected=null;Refresh(); }
 void AddPageClick(object sender,RoutedEventArgs e) { Snapshot();Project.Pages.Add(new(){Name="Page "+(Project.Pages.Count+1),Width=Current.Width,Height=Current.Height});pageIndex=Project.Pages.Count-1;selected=null;Mark();Refresh(); }
 void DuplicatePageClick(object sender,RoutedEventArgs e) { Snapshot();var copy=System.Text.Json.JsonSerializer.Deserialize<Page>(System.Text.Json.JsonSerializer.Serialize(Current))!;copy.Name+=" copy";Project.Pages.Insert(pageIndex+1,copy);pageIndex++;selected=null;Mark();Refresh(); }
 void DeletePageClick(object sender,RoutedEventArgs e) { if(Project.Pages.Count<=1)return;Snapshot();Project.Pages.RemoveAt(pageIndex);pageIndex=Math.Min(pageIndex,Project.Pages.Count-1);selected=null;Mark();Refresh(); }
 void ToolClick(object sender,RoutedEventArgs e) {tool=(string)((Button)sender).Tag;Status.Text=tool+" · drag on the canvas";Artboard.Cursor=tool=="Select"?Cursors.Arrow:Cursors.Cross;}
 void LayerChanged(object sender,SelectionChangedEventArgs e) {if(updating)return;selected=LayersList.SelectedItem is ListBoxItem item?Current.Elements.FirstOrDefault(l=>l.Id==(string)item.Tag):null;RefreshCanvas();}
 void CanvasDown(object sender,MouseButtonEventArgs e) {
  if(Project.Kind=="Document")return;
  Artboard.Focus();Keyboard.ClearFocus();start=e.GetPosition(Artboard);gestureSnapshot=Project.Serialize();
  if(tool=="Select") {
   selected=Current.Elements.LastOrDefault(l=>l.Visible && start.X>=l.X && start.X<=l.X+l.Width && start.Y>=l.Y && start.Y<=l.Y+l.Height);
   if(selected==null){RefreshCanvas();return;} original=new(selected.X,selected.Y);
  } else {
   selected=new(){Type=tool,Name=tool+" "+(Current.Elements.Count+1),X=start.X,Y=start.Y,Fill=ColorInput.Text,Width=tool=="Text"?280:1,Height=tool=="Text"?70:1,StrokeWidth=BrushSize.Value};
   if(tool=="Brush") {selected.X=0;selected.Y=0;selected.Width=Current.Width;selected.Height=Current.Height;selected.Points=[start.X,start.Y,start.X+.01,start.Y+.01];}
   Current.Elements.Add(selected);
  }
  drawing=true; Artboard.CaptureMouse();RefreshCanvas();e.Handled=true;
 }
 void CanvasMove(object sender,MouseEventArgs e) {
  if(!drawing || selected==null)return;
  if(e.LeftButton!=MouseButtonState.Pressed){FinishGesture();return;}
  var p=e.GetPosition(Artboard);
  if(tool=="Select"){selected.X=original.X+p.X-start.X;selected.Y=original.Y+p.Y-start.Y;}
  else if(tool=="Brush"){selected.Points.Add(p.X);selected.Points.Add(p.Y);}
  else if(tool!="Text"){selected.X=Math.Min(start.X,p.X);selected.Y=Math.Min(start.Y,p.Y);selected.Width=Math.Max(1,Math.Abs(p.X-start.X));selected.Height=Math.Max(1,Math.Abs(p.Y-start.Y));}
  RefreshCanvas();
 }
 void CanvasUp(object sender,MouseButtonEventArgs e)=>FinishGesture();
 void CanvasLostCapture(object sender,MouseEventArgs e)=>FinishGesture();
 void FinishGesture() {
  if(!drawing)return;drawing=false;
  if(tool=="Brush" && selected?.Type=="Brush" && selected.Points.Count>0) {
   var xs=selected.Points.Where((_,i)=>i%2==0).ToArray();var ys=selected.Points.Where((_,i)=>i%2==1).ToArray();double x=xs.Min()-selected.StrokeWidth,y=ys.Min()-selected.StrokeWidth;
   selected.X=x;selected.Y=y;selected.Width=Math.Max(1,xs.Max()-x+selected.StrokeWidth);selected.Height=Math.Max(1,ys.Max()-y+selected.StrokeWidth);
   for(int i=0;i<selected.Points.Count;i++)selected.Points[i]-=i%2==0?x:y;
  }
  if(gestureSnapshot!=Project.Serialize()){undo.Push(gestureSnapshot);redo.Clear();Mark();} Artboard.ReleaseMouseCapture();RefreshCanvas();
 }
 void ImageClick(object sender,RoutedEventArgs e) {var d=new OpenFileDialog{Filter="Images|*.png;*.jpg;*.jpeg;*.bmp;*.gif;*.tif;*.tiff",Multiselect=true};if(d.ShowDialog(this)==true)foreach(var f in d.FileNames)ImportImage(f);}
 void ImportImage(string file) {
  if(Project.Kind=="Document"){Status.Text="Image import is available in Canvas and Presentation projects.";return;}
  Guard(()=>{if(new FileInfo(file).Length>50*1024*1024)throw new InvalidDataException("Please use an image smaller than 50 MB.");var image=new BitmapImage();image.BeginInit();image.CacheOption=BitmapCacheOption.OnLoad;image.UriSource=new Uri(file);image.EndInit();double scale=Math.Min(1,Math.Min(Current.Width*.7/image.PixelWidth,Current.Height*.7/image.PixelHeight));Commit(()=>{selected=new(){Type="Image",Name=System.IO.Path.GetFileName(file),X=80,Y=80,Width=image.PixelWidth*scale,Height=image.PixelHeight*scale,Image=Convert.ToBase64String(File.ReadAllBytes(file))};Current.Elements.Add(selected);});});
 }
 void DeleteClick(object sender,RoutedEventArgs e){if(selected!=null)Commit(()=>{Current.Elements.Remove(selected);selected=null;});}
 void DuplicateClick(object sender,RoutedEventArgs e){if(selected==null)return;Commit(()=>{var copy=System.Text.Json.JsonSerializer.Deserialize<Layer>(System.Text.Json.JsonSerializer.Serialize(selected))!;copy.Id=Guid.NewGuid().ToString("N");copy.X+=24;copy.Y+=24;copy.Name+=" copy";Current.Elements.Add(copy);selected=copy;});}
 void RaiseClick(object sender,RoutedEventArgs e)=>Reorder(1);
 void LowerClick(object sender,RoutedEventArgs e)=>Reorder(-1);
 void Reorder(int delta){if(selected==null)return;int old=Current.Elements.IndexOf(selected), next=Math.Clamp(old+delta,0,Current.Elements.Count-1);if(old!=next)Commit(()=>{Current.Elements.RemoveAt(old);Current.Elements.Insert(next,selected);});}
 void SetColor(string color) {
  if(Project.Kind=="Document"){DocumentEditor.Selection.ApplyPropertyValue(TextElement.ForegroundProperty,Renderer.Color(color));ColorInput.Text=color;Mark();}
  else if(selected!=null)Commit(()=>selected.Fill=color);
  else ColorInput.Text=color;
 }
 void ColorChanged(object sender,RoutedEventArgs e) {if(!updating)SetColor(ColorInput.Text);}
 void PropertyBegin(object sender,MouseButtonEventArgs e){if(selected!=null)Snapshot();}
 void OpacityChanged(object sender,RoutedPropertyChangedEventArgs<double> e){if(updating || selected==null)return;selected.Opacity=e.NewValue;Mark();RefreshCanvas();}
 void GeometryChanged(object sender,RoutedEventArgs e){if(updating || selected==null)return;if(double.TryParse(WidthInput.Text,out var w)&&double.TryParse(HeightInput.Text,out var h)&&double.IsFinite(w)&&double.IsFinite(h)&&w>0&&h>0&&w<=8192&&h<=8192)Commit(()=>{selected.Width=w;selected.Height=h;});else RefreshCanvas();}
 void TextChanged(object sender,RoutedEventArgs e){if(!updating && selected?.Type=="Text")Commit(()=>selected.Text=LayerTextInput.Text);}
 void FontClick(object sender,RoutedEventArgs e) {var menu=new ContextMenu();foreach(var name in Fonts.SystemFontFamilies.Select(f=>f.Source).OrderBy(n=>n)){var item=new MenuItem{Header=name,FontFamily=new FontFamily(name)};item.Click+=(_,_)=>{Format(TextElement.FontFamilyProperty,new FontFamily(name),l=>l.Font=name);FontButton.Content=name+" ▾";};menu.Items.Add(item);}menu.PlacementTarget=FontButton;menu.IsOpen=true;}
 void SizeClick(object sender,RoutedEventArgs e){var menu=new ContextMenu();foreach(var size in new double[]{10,12,14,16,18,20,24,28,32,36,48,64,72,96,128}){var item=new MenuItem{Header=size+" px"};item.Click+=(_,_)=>{Format(TextElement.FontSizeProperty,size,l=>l.FontSize=size);SizeButton.Content=size+" px ▾";};menu.Items.Add(item);}menu.PlacementTarget=SizeButton;menu.IsOpen=true;}
 void Format(DependencyProperty property,object value,Action<Layer> apply){if(Project.Kind=="Document"){DocumentEditor.Selection.ApplyPropertyValue(property,value);Mark();DocumentEditor.Focus();}else if(selected?.Type=="Text")Commit(()=>apply(selected));}
 void BoldClick(object sender,RoutedEventArgs e){if(Project.Kind=="Document"){EditingCommands.ToggleBold.Execute(null,DocumentEditor);Mark();}else if(selected?.Type=="Text")Commit(()=>selected.Bold=!selected.Bold);}
 void ItalicClick(object sender,RoutedEventArgs e){if(Project.Kind=="Document"){EditingCommands.ToggleItalic.Execute(null,DocumentEditor);Mark();}else if(selected?.Type=="Text")Commit(()=>selected.Italic=!selected.Italic);}
 void UndoClick(object sender,RoutedEventArgs e)=>Undo();
 void RedoClick(object sender,RoutedEventArgs e)=>Redo();
 void Undo(){FinishGesture();if(Project.Kind=="Document" && DocumentEditor.CanUndo){DocumentEditor.Undo();return;}if(undo.Count==0)return;FlushDocument();redo.Push(Project.Serialize());Project=Project.Deserialize(undo.Pop());pageIndex=Math.Min(pageIndex,Project.Pages.Count-1);selected=null;Mark();Refresh();}
 void Redo(){if(Project.Kind=="Document" && DocumentEditor.CanRedo){DocumentEditor.Redo();return;}if(redo.Count==0)return;FlushDocument();undo.Push(Project.Serialize());Project=Project.Deserialize(redo.Pop());pageIndex=Math.Min(pageIndex,Project.Pages.Count-1);selected=null;Mark();Refresh();}
 void Keys(object sender,KeyEventArgs e) {
  var ctrl=Keyboard.Modifiers.HasFlag(ModifierKeys.Control);
  if(ctrl && e.Key==Key.S){Save(Keyboard.Modifiers.HasFlag(ModifierKeys.Shift));e.Handled=true;return;}
  if(e.OriginalSource is TextBox || e.OriginalSource is RichTextBox)return;
  if(ctrl && e.Key==Key.Z){if(Keyboard.Modifiers.HasFlag(ModifierKeys.Shift))Redo();else Undo();e.Handled=true;return;}
  if(e.Key==Key.Delete){DeleteClick(this,e);e.Handled=true;} if(e.Key==Key.Escape){FinishGesture();selected=null;tool="Select";RefreshCanvas();}
  tool=e.Key switch{Key.V=>"Select",Key.R=>"Rectangle",Key.B=>"Brush",Key.T=>"Text",Key.O=>"Ellipse",_=>tool};
 }
 void PresentClick(object sender,RoutedEventArgs e) {
  if(Project.Kind=="Document"){Status.Text="Use Print / PDF for documents.";return;}
  int index=pageIndex;var view=new Viewbox{Child=Renderer.Page(Project.Pages[index])};
  var presentation=new Window{Title=Project.Name+" — Present",Background=Brushes.Black,WindowStyle=WindowStyle.None,WindowState=WindowState.Maximized,Content=view};
  presentation.PreviewKeyDown+=(_,key)=>{if(key.Key==Key.Escape){presentation.Close();return;}if(key.Key is Key.Right or Key.Space)index=Math.Min(Project.Pages.Count-1,index+1);if(key.Key==Key.Left)index=Math.Max(0,index-1);view.Child=Renderer.Page(Project.Pages[index]);};
  presentation.MouseLeftButtonDown+=(_,_)=>{index=Math.Min(Project.Pages.Count-1,index+1);view.Child=Renderer.Page(Project.Pages[index]);};presentation.ShowDialog();
 }
}

