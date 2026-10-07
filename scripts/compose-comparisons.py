from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json
root=Path(__file__).resolve().parent.parent
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',28)
metrics=[]
for width,key in [(1440,'d'),(1100,'t'),(390,'m')]:
 ref=Image.open(root/f'reference/shot-{key}.png').convert('RGB')
 actual=Image.open(root/f'review/feed-{width}.png').convert('RGB')
 assert ref.size==actual.size
 gap=24;header=64
 pair=Image.new('RGB',(ref.width*2+gap,ref.height+header),'#0B0B0D')
 pair.paste(ref,(0,header));pair.paste(actual,(ref.width+gap,header))
 draw=ImageDraw.Draw(pair);draw.text((20,16),f'Reference / {width}px',font=font,fill='#ECECEF');draw.text((ref.width+gap+20,16),f'Next.js / {width}px',font=font,fill='#ECECEF')
 pair.save(root/f'review/compare-{width}.png')
 source=Image.open(root/f'review/html-reference-{width}.png').convert('RGB')
 for label,baseline in [('supplied-png',ref),('html-same-browser',source)]:
  diff=ImageChops.difference(baseline,actual)
  hist=diff.histogram();mean=sum((i%256)*n for i,n in enumerate(hist))/(actual.width*actual.height*3)
  changed=sum(1 for pixel in diff.getdata() if max(pixel)>16)/(actual.width*actual.height)*100
  metrics.append({'width':width,'baseline':label,'mean_absolute_channel_error_0_255':round(mean,4),'pixels_over_16_channel_difference_pct':round(changed,4)})
  diff.save(root/f'review/diff-{label}-{width}.png')
(root/'review/pixel-metrics.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2))
