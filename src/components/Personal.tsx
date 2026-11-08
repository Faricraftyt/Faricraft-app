import { useSyncExternalStore, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Share2 } from 'lucide-react';
import { t } from '../services/i18n';
type Item = { id: string; title: string; url: string; kind: 'video' | 'resource' };
type Entry = Item & { action: 'download' | 'read'; time: number };
type State = { favorites: Item[]; history: Entry[] };
const key = 'faricraft-personal-v1';
const empty: State = { favorites: [], history: [] };
let cache: State = empty;
try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if(value && Array.isArray(value.favorites) && Array.isArray(value.history)) cache = value; } catch {}
const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => fn()); }
function save(next: State) { try { localStorage.setItem(key, JSON.stringify(next)); cache = next; emit(); return true; } catch { alert(t('No se pudo guardar. Revisá el espacio o los permisos del navegador.')); return false; } }
window.addEventListener('storage', e => { if(e.key === key) { try { const value = JSON.parse(e.newValue || 'null'); cache = value && Array.isArray(value.favorites) && Array.isArray(value.history) ? value : empty; emit(); } catch {} } });
function usePersonal() { return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => cache); }
export function recordAction(item: Item, action: Entry['action']) { save({ ...cache, history: [{ ...item, action, time: Date.now() }, ...cache.history].slice(0, 300) }); }
export function PersonalActions({ item }: { item: Item }) {
 const state = usePersonal(); const [status, setStatus] = useState('');
 const selected = state.favorites.some(x => x.id === item.id && x.kind === item.kind);
 async function share() {
  const url = new URL(item.url, location.href).href;
  try { if(navigator.share) { await navigator.share({ title: item.title, url }); return; } } catch(e) { if((e as Error).name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); setStatus(t('Enlace copiado')); } catch { window.prompt(t('Copiá este enlace para compartir:'), url); }
 }
 return <div className="personal-actions"><button aria-pressed={selected} onClick={() => save({ ...cache, favorites: selected ? cache.favorites.filter(x => !(x.id === item.id && x.kind === item.kind)) : [item, ...cache.favorites] })}><Heart size={17} fill={selected ? 'currentColor' : 'none'} />{t(selected ? 'Guardado' : 'Favorito')}</button><button onClick={share}><Share2 size={17}/>{t('Compartir')}</button><small role="status">{status}</small></div>;
}
export function PersonalPage() {
 const state = usePersonal(); const [tab, setTab] = useState('favorites');
 return <><h1>{t('Mi biblioteca')}</h1><p>{t('Tus favoritos y actividad se guardan solo en este dispositivo.')}</p><div className="chips"><button aria-pressed={tab === 'favorites'} onClick={() => setTab('favorites')}>{t('Favoritos')}</button><button aria-pressed={tab === 'history'} onClick={() => setTab('history')}>{t('Historial de descargas y lecturas')}</button></div>
 {tab === 'favorites' ? <>{!state.favorites.length && <p>{t('Todavía no guardaste favoritos.')}</p>}{state.favorites.map(item => <article className="panel" key={item.kind+item.id}><h2>{item.title}</h2>{item.kind === 'resource' ? <Link to={item.url.replace(/^#/, "")}>{t('Ver descarga')}</Link> : <a href={item.url} target="_blank" rel="noreferrer">{t('Abrir en YouTube ↗')}</a>}<PersonalActions item={item}/></article>)}</> : <><p>{t('Registra clics en Descargar y Leer; no confirma que el archivo se haya descargado o el libro se haya leído.')}</p>{!!state.history.length && <button onClick={() => { if(confirm(t('¿Borrar todo el historial de este dispositivo?'))) save({...cache, history: []}); }}>{t('Borrar historial')}</button>}{!state.history.length && <p>{t('Todavía no hay actividad.')}</p>}{state.history.map((entry, i) => <article className="panel" key={entry.time+'-'+i}><small>{t(entry.action === 'read' ? 'Lectura' : 'Descarga')} · {new Date(entry.time).toLocaleString()}</small><h2>{entry.title}</h2><Link to={entry.url.replace(/^#/, "")}>{t('Ver descarga')}</Link><button onClick={() => save({...cache, history: cache.history.filter((_,index) => index !== i)})}>{t('Quitar del historial')}</button></article>)}</>}
 </>;
}
