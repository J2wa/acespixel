export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A deliberately small Markdown renderer: raw HTML, images and script URLs are never executed.
export function markdown(source){
 const inline=text=>{
  const tokens=[];const hold=html=>{tokens.push(html);return '\u0000'+(tokens.length-1)+'\u0000';};
  let out=escapeHtml(text.replace(/\u0000/g,''));
  out=out.replace(/`([^`]+)`/g,(_,code)=>hold('<code>'+code+'</code>'));
  out=out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,path,label)=>hold('<button type="button" class="wiki-link" data-wiki="'+path.trim()+'">'+(label||path)+'</button>'));
  out=out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>hold('<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>'));
  out=out.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  return out.replace(/\u0000(\d+)\u0000/g,(_,i)=>tokens[Number(i)]);
 };
 let code=null,html=[];
 for(const line of source.split('\n')){
  if(line.startsWith('```')){if(code!==null){html.push('<pre><code>'+escapeHtml(code.join('\n'))+'</code></pre>');code=null;}else code=[];continue;}
  if(code!==null){code.push(line);continue;}
  const heading=line.match(/^(#{1,6})\s+(.*)$/);if(heading){html.push('<h'+heading[1].length+'>'+inline(heading[2])+'</h'+heading[1].length+'>');continue;}
  if(/^[-*] /.test(line)){html.push('<div class="md-list">• '+inline(line.slice(2))+'</div>');continue;}
  if(/^> /.test(line)){html.push('<blockquote>'+inline(line.slice(2))+'</blockquote>');continue;}
  if(line.trim())html.push('<p>'+inline(line)+'</p>');
 }
 if(code!==null)html.push('<pre><code>'+escapeHtml(code.join('\n'))+'</code></pre>');
 return html.join('');
}
