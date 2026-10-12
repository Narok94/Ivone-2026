import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if ((specifier === './db.js' && context.parentURL?.includes('/api/')) || specifier.endsWith('/api/db.js')) return { url: new URL('./fixtures/financial-database.ts', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
import { pool } from './fixtures/financial-database.js';
import { searchClients } from '../server/lib/client-search.js';
import { searchReply, transition, resumeClient, type Reply, type Snapshot } from '../src/lib/mobile-conversation.js';
import { createSession } from '../server/lib/session.js';
const { default: clients } = await import('../api/clients.js');
const { default: operations } = await import('../api/operations.js');
process.env.NODE_ENV = 'test'; delete process.env.VERCEL;
const res = () => ({ code: 200, body: null as any, headers: {} as Record<string,string>, setHeader(k: string,v: string){this.headers[k]=v;},status(n: number){this.code=n;return this;},json(v: any){this.body=v;} });
const snapshot: Snapshot = { clients: [], sales: [], payments: [], remoteSearch: true };
async function resolve(reply: Reply): Promise<Reply> {
 if (reply.action?.type !== 'searchClients') return reply;
 return searchReply(reply.action.selection, await searchClients(pool, reply.action.query, reply.action.offset));
}
test('A–F/M/N: indexed, bounded searches with 5,000 fictitious clients and explicit choices', async t => {
 try {
  await pool.query("INSERT INTO clientes(full_name) SELECT 'Pessoa Ficticia ' || lpad(i::text,5,'0') FROM generate_series(1,5000) i");
  for(const name of ['Bruna Costa','Bruna Oliveira','Bruna Ferreira','Júlia Ávila']) await pool.query('INSERT INTO clientes(full_name) VALUES ($1)',[name]);
  await pool.query('VACUUM ANALYZE clientes');
  await t.test('A/B/D/E exact, first-name, partial, case and accent matching',async()=>{
   assert.equal((await searchClients(pool,'BRUNA COSTA')).clients[0].fullName,'Bruna Costa');
   assert.deepEqual((await searchClients(pool,'Bruna')).clients.map((c:any)=>c.fullName),['Bruna Costa','Bruna Ferreira','Bruna Oliveira']);
   assert.equal((await searchClients(pool,'Olive')).clients[0].fullName,'Bruna Oliveira');
   assert.equal((await searchClients(pool,'julia avila')).clients[0].fullName,'Júlia Ávila');
  });
  await t.test('C/F unknown returns empty, typo offers only plausible candidates',async()=>{
   assert.equal((await searchClients(pool,'Zzz Inexistente')).clients.length,0);
   const typo=await searchClients(pool,'Brunna Costa');assert(typo.clients.some((c:any)=>c.fullName==='Bruna Costa'));assert.equal(typo.uncertain,true);assert(typo.clients.every((c:any)=>c.fullName.startsWith('Bruna')));
  });
  await t.test('M bounded pages and actual index plan, including two-letter prefixes',async()=>{
   const first=await searchClients(pool,'Pessoa Ficticia');const second=await searchClients(pool,'Pessoa Ficticia',8);assert.equal(first.clients.length,8);assert.equal(first.hasMore,true);assert(!second.clients.some((c:any)=>first.clients.some((p:any)=>p.id===c.id)));
   const plan=await pool.query("EXPLAIN (FORMAT JSON) SELECT id FROM clientes WHERE public.ivone_client_name(full_name) LIKE '%bruna%' LIMIT 9");assert.match(JSON.stringify(plan.rows),/clientes_name_search_gin/);
   const short=await pool.query("EXPLAIN (FORMAT JSON) SELECT id FROM clientes WHERE public.ivone_client_name(full_name) LIKE 'br%' LIMIT 9");assert.match(JSON.stringify(short.rows),/clientes_name_search_order/);
   await assert.rejects(searchClients(pool,"a"));await assert.rejects(searchClients(pool,'Bruna',-1));assert.equal((await searchClients(pool,"%'; DROP TABLE clientes; --")).clients.length,0);
  });
  await t.test('N suggestions never choose automatically and an invalid number stays unselected',async()=>{
   let reply=await resolve(transition({type:'idle'},'Vendi um Egeo Black pra Bruna.',snapshot));assert.equal(reply.state.type,'choose');assert.equal(reply.action,undefined);
   reply=await resolve(transition(reply.state,'99',snapshot));assert.equal(reply.state.type,'choose');
   reply=transition(reply.state,'2',snapshot);assert.equal(reply.state.type,'finance');if(reply.state.type==='finance')assert.equal(reply.state.draft.value.candidates[0].fullName,'Bruna Ferreira');
  });
  await t.test('G/H/L registration reuses supplied fields, duplicate guard and cancellation',async()=>{
   const reply=transition({type:'idle'},'Cadastre uma cliente chamada Bruna Nova, telefone 11999998888, e-mail bruna@example.test, rua Rua Ficticia, cidade Santos, estado SP',snapshot);assert.equal(reply.action,undefined);assert.equal(reply.summary,undefined);assert.deepEqual(reply.choices,['Sim','Cancelar']);if(reply.state.type==='clientForm'){assert.equal(reply.state.data.fullName,'Bruna Nova');assert.equal(reply.state.data.phone,'11999998888');assert.equal(reply.state.data.email,'bruna@example.test');assert.equal(reply.state.data.street,'Rua Ficticia');assert.equal(reply.state.data.city,'Santos');assert.equal(reply.state.data.state,'SP');}assert.equal(transition(reply.state,'Sim',snapshot).action?.type,'openClientForm');
   assert.equal(transition(reply.state,'Cancelar',snapshot).action,undefined);
   const req:any={method:'POST',headers:{host:'app.test',origin:'http://app.test'},query:{},body:{fullName:'brúna costa',confirmed:true,conversational:true}};
   const sessionResponse=res();const session=await createSession(req,sessionResponse,{id:99,username:'Ivone'});req.headers.cookie=sessionResponse.headers['Set-Cookie'].split(';')[0];req.headers['x-csrf-token']=session.csrfToken;
   const duplicate=res();await clients(req,duplicate);assert.equal(duplicate.code,409);
   req.body={fullName:'Nova Pessoa',conversational:true};const unconfirmed=res();await clients(req,unconfirmed);assert.equal(unconfirmed.code,400);
   req.headers.cookie='';req.query={q:'Bruna'};req.method='GET';const unauthorized=res();await clients(req,unauthorized);assert.equal(unauthorized.code,401);
  });
  await t.test('I/J/K/O missing-client signup preserves complete sale and requires separate financial confirmation',async()=>{
   let reply=await resolve(transition({type:'idle'},'Vendi dois perfumes para Bruna Nova por 300 reais, ela pagou 100 e ficou devendo 200.',snapshot));assert.equal(reply.state.type,'missingClient');assert.match(reply.text,/Não encontrei Bruna Nova/);assert(!reply.choices.some(c=>c.includes('Pessoa')));
   reply=transition(reply.state,'Sim',snapshot);assert.equal(reply.action?.type,'openClientForm');assert.equal(reply.state.type,'clientForm');
   if(reply.state.type!=='clientForm')throw new Error('Missing form state');
   const request={mode:'create' as const,data:reply.state.data,resume:reply.state.resume,beforeIds:[]};const person={...request.data,id:'00000000-0000-4000-8000-000000009999'};
   reply=resumeClient(request,person,snapshot);assert.equal(reply.action,undefined);assert.equal(reply.state.type,'finance');assert.match(reply.summary!,/2 perfumes/);assert.match(reply.summary!,/300,00/);assert.match(reply.summary!,/100,00/);assert.match(reply.summary!,/Bruna Nova/);
   assert.equal(transition(reply.state,'Cancelar',snapshot).action,undefined);assert.equal(transition(reply.state,'Confirmar',snapshot).action?.type,'financial');
  });
  await t.test('mobile initial snapshot returns no client catalogue despite 5,000 records',async()=>{
   const req:any={method:'GET',headers:{host:'app.test'},query:{mode:'chat',ids:''}};const sessionResponse=res();await createSession(req,sessionResponse,{id:99,username:'Ivone'});req.headers.cookie=sessionResponse.headers['Set-Cookie'].split(';')[0];const response=res();await operations(req,response);assert.equal(response.code,200);assert.equal(response.body.clients.length,0);
  });
 }finally{await pool.end();}
});
