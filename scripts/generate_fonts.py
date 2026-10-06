"""Generate compact redistributable VLW packs from Nunito and Inter (OFL)."""
import argparse
import struct
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def pack(path,size,points,clock=False):
 font=ImageFont.truetype(path,size);font.set_variation_by_name('Medium');ascent,descent=font.getmetrics();glyphs=[]
 for cp in points:
  ch=chr(cp);left,top,right,bottom=font.getbbox(ch,anchor='ls');w,h=right-left,bottom-top
  image=Image.new('L',(max(1,w),max(1,h)));ImageDraw.Draw(image).text((-left,-top),ch,font=font,fill=255,anchor='ls')
  box=image.getbbox();advance=round(font.getlength(ch));dx=left;dy=-top
  if box:
   image=image.crop(box);w,h=image.size;dx+=box[0];dy-=box[1];pixels=image.tobytes()
  else:w=h=0;pixels=b''
  if clock and ch.isdigit():
   advance=round(size*46/76);dx=(advance-w)//2
  if clock and ch==':':
   advance=round(size*.24);w=max(2,round(size*6/76));h=max(w*2,round(size*25/76));dy=round(size*.5);dx=(advance-w)//2
   dots=Image.new('L',(w*4,h*4));draw=ImageDraw.Draw(dots)
   draw.ellipse((0,0,w*4-1,w*4-1),fill=255);draw.ellipse((0,(h-w)*4,w*4-1,h*4-1),fill=255)
   pixels=dots.resize((w,h),Image.Resampling.LANCZOS).tobytes()
  glyphs.append((cp,h,w,advance,dy,dx,pixels))
 # VLW measures only the included glyphs; keep all metrics within device limits.
 ascent=max(g[4] for g in glyphs);descent=max(0,max(g[1]-g[4] for g in glyphs))
 assert ascent<=64 and descent<=32 and all(g[1]<=64 and g[2]<=64 for g in glyphs)
 result=bytearray(struct.pack('>6I',len(points),12,min(size,48),0,ascent,descent))
 for cp,h,w,adv,dy,dx,pix in glyphs:result.extend(struct.pack('>HBBBbb',cp,h,w,adv,dy,dx))
 for *_,pix in glyphs:result.extend(pix)
 return bytes(result)

if __name__ == "__main__":
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument("--clock-font",required=True,type=Path)
 parser.add_argument("--text-font",required=True,type=Path)
 parser.add_argument("--output",default=Path("assets/fonts"),type=Path)
 args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 for slot,path,sizes,points,clock in [
  (0,args.clock_font,[18,24,36,76],sorted(set(map(ord," 0123456789:"))),True),
  (1,args.text_font,[13,18,24,32],list(range(32,127))+[176,8211,8230],False)]:
  for index,size in enumerate(sizes):
   data=pack(str(path),size,points,clock)
   (args.output/f"{slot}-{index}.vlw").write_bytes(data)
   print(slot,index,len(data))
