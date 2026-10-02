export function adjustPixels(image,{brightness=0,contrast=0,saturation=0,grayscale=false,opacity=100}={}){
  const out=new Uint8ClampedArray(image.data),c=(1+contrast/100),sat=grayscale?0:1+saturation/100;
  for(let i=0;i<out.length;i+=4){
    const r=out[i],g=out[i+1],b=out[i+2],lum=.2126*r+.7152*g+.0722*b;
    out[i+3]=out[i+3]*opacity/100;
    for(let k=0;k<3;k++)out[i+k]=((lum+(out[i+k]-lum)*sat)-127.5)*c+127.5+brightness*2.55;
  }
  return out;
}
export function applyMask(data,mask){
  if(mask.length!==data.length/4)throw new Error('Mask dimensions do not match.');
  for(let i=0;i<mask.length;i++)if(mask[i])data[i*4+3]=0;
  return data;
}
export function resizeDimensions(width,height,keepRatio,sourceWidth,sourceHeight){
  width=Math.round(Number(width));height=keepRatio?Math.round(width*sourceHeight/sourceWidth):Math.round(Number(height));
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>6000||height>6000||width*height>25_000_000)throw new Error('Use dimensions from 1–6,000 px, up to 25 megapixels.');
  return {width,height};
}
