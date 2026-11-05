"""Refresh official YouTube feed without credentials; preserve last good data on failure."""
import json, pathlib, re, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
ROOT=pathlib.Path(__file__).resolve().parents[1]
def refresh(root=ROOT, fetch=None):
    folder=root/'public/data'; target=folder/'videos.json'
    settings=json.loads((folder/'settings.json').read_text())
    previous=json.loads(target.read_text())
    channel=settings.get('channelId','')
    try:
        if not re.fullmatch(r'UC[\w-]{22}',channel):
            raise ValueError('Configuración pendiente: agregá un Channel ID válido en settings.json.')
        url='https://www.youtube.com/feeds/videos.xml?channel_id='+channel
        if fetch: payload=fetch(url)
        else:
            request=urllib.request.Request(url,headers={'User-Agent':'FaricraftApp/1.0'})
            with urllib.request.urlopen(request,timeout=30) as response: payload=response.read(2_000_000)
        feed=ET.fromstring(payload)
        ns={'a':'http://www.w3.org/2005/Atom','yt':'http://www.youtube.com/xml/schemas/2015','m':'http://search.yahoo.com/mrss/'}
        if feed.tag!='{http://www.w3.org/2005/Atom}feed': raise ValueError('La respuesta no es un feed Atom.')
        items=[]
        for entry in feed.findall('a:entry',ns):
            vid=entry.findtext('yt:videoId','',ns)
            if not re.fullmatch(r'[\w-]{11}',vid): continue
            items.append({'id':vid,'title':entry.findtext('a:title','',ns),'description':entry.findtext('m:group/m:description','',ns),'date':entry.findtext('a:published','',ns),'thumbnail':f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg'})
        data={'updatedAt':datetime.now(timezone.utc).isoformat(),'error':None,'items':sorted(items,key=lambda v:v['date'],reverse=True)}
    except Exception as exc:
        data={**previous,'error':str(exc)}
        print('Aviso: se conservan los videos anteriores.',str(exc))
    temp=target.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(target)
    return data
if __name__=='__main__':refresh()
