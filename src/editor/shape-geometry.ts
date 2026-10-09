import type { EdonElement } from '../model/document'

export function roundedRectPath(width:number,height:number,radii:EdonElement['cornerRadii'],inset=0):string {
 const [a,b,c,d]=radii.map(radius=>Math.max(0,radius))
 const ratio=Math.min(1,width/(a+b||1),width/(c+d||1),height/(a+d||1),height/(b+c||1))
 inset=Math.min(inset,width/2,height/2)
 const [tl,tr,br,bl]=[a,b,c,d].map(radius=>Math.max(0,radius*ratio-inset))
 const left=inset,top=inset,right=width-inset,bottom=height-inset
 return `M${left+tl} ${top} H${right-tr} A${tr} ${tr} 0 0 1 ${right} ${top+tr} V${bottom-br} A${br} ${br} 0 0 1 ${right-br} ${bottom} H${left+bl} A${bl} ${bl} 0 0 1 ${left} ${bottom-bl} V${top+tl} A${tl} ${tl} 0 0 1 ${left+tl} ${top} Z`
}
export function shapeGradient(width:number,height:number,angle:number){
 const radians=angle*Math.PI/180,dx=Math.sin(radians),dy=-Math.cos(radians),length=Math.abs(width*dx)+Math.abs(height*dy)
 return {x1:width/2-dx*length/2,y1:height/2-dy*length/2,x2:width/2+dx*length/2,y2:height/2+dy*length/2}
}
