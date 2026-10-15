const express=require('express'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const app=express(),PORT=process.env.PORT||3000,DB=process.env.DATA_FILE||path.join(__dirname,'data.json'),PW=process.env.ADMIN_PASSWORD||'change-me';
app.set('trust proxy',1);app.use(express.json({limit:'50kb'}));app.use(express.static(path.join(__dirname,'public')));
const P=[['vip','👑','VIP برونزي','رتبة VIP أساسية داخل السيرفر مع روم صوتي خاص.',50000],
['vip','💎','VIP ذهبي','مزايا متقدمة وأولوية دخول وروم صوتي مميز.',100000,'الأكثر طلباً'],
['vip','🔥','VIP بلاتينيوم','أعلى مستوى VIP مع كل المزايا الحصرية.',200000],
['money','💰','باقة مال صغيرة','مبلغ ابتدائي داخل اللعبة لبداية أسرع.',25000],
['money','💵','باقة مال كبيرة','مبلغ كبير داخل اللعبة مع هدية إضافية.',100000],
['cars','🚗','سيارة خاصة','سيارة حصرية باسمك داخل السيرفر.',150000],
['menu','📋','منيو كامل','قائمة خيارات شخصية كاملة داخل السيرفر.',25000],
['menu','🕊️','منيو طيران','تفعيل خاصية الطيران الشخصية.',15000],
['nick','🪪','نك نيم','اسم مميز يظهر فوق رأس شخصيتك.',25000],
['skin','👕','طلب سكن','إضافة سكن (زي) خاص لشخصيتك.',100000],
['house','🏝️','مقر خاص (بيت / جزيرة)','مقر خاص مع روم صوتي ورتبة كبار الشخصيات.',500000,'حصري'],
['house','🎖️','رتبة إدارية / ترقية','تتم عبر فتح تذكرة فقط ولا تُباع مباشرة.',0,'',1]];
const seed={settings:{name:'𝗪𝗢𝗟𝗙 𝗖𝗜𝗧𝗬 𝗥𝗣',discord:'https://discord.gg/YOUR_INVITE',wa:'9647700000000',cur:'د.ع',pay:[
{id:'zain',n:'زين كاش',ic:'📱',info:'رقم زين كاش: 07XX XXX XXXX (باسم: ........)'},
{id:'asia',n:'آسيا حوالة',ic:'💸',info:'رقم الحوالة: 07XX XXX XXXX (باسم: ........)'},
{id:'qi',n:'كي كارد / ماستر كارد',ic:'💳',info:'رقم البطاقة: XXXX XXXX XXXX XXXX (باسم: ........)'},
{id:'usdt',n:'USDT (TRC20)',ic:'🪙',info:'المحفظة: TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'}]},
products:P.map((x,i)=>({id:i+1,c:x[0],ic:x[1],n:x[2],d:x[3],p:x[4],b:x[5]||'',t:x[6]||0,on:true})),orders:[]};
let db;try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch{db=seed}
const save=()=>fs.writeFileSync(DB,JSON.stringify(db,null,1));
const hook=o=>{const u=process.env.DISCORD_WEBHOOK;if(!u)return;
 fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({allowed_mentions:{parse:[]},content:`🛒 **طلب جديد ${o.id}**\nاللاعب: ${o.name}\nديسكورد: ${o.dc}\nالدفع: ${o.method}\n${o.items.map(i=>'• '+i.n).join('\n')}\nالمجموع: ${o.total}`})}).catch(()=>{})};
app.get('/api/store',(q,s)=>s.json({settings:db.settings,products:db.products.filter(p=>p.on!==false)}));
app.post('/api/orders',(q,s)=>{const b=q.body||{},name=String(b.name||'').trim().slice(0,40),dc=String(b.dc||'').trim().slice(0,40),m=db.settings.pay.find(p=>p.id===b.method);
 const its=[...new Set(Array.isArray(b.items)?b.items:[])].map(id=>db.products.find(p=>p.id===id&&p.on!==false&&!p.t)).filter(Boolean);
 if(!name||!dc||!m||!its.length)return s.status(400).json({error:'bad'});
 const o={id:'WC-'+crypto.randomBytes(3).toString('hex').toUpperCase(),at:Date.now(),name,dc,method:m.n,items:its.map(i=>({n:i.n,p:i.p})),total:its.reduce((a,i)=>a+i.p,0),status:'pending'};
 db.orders.unshift(o);save();hook(o);s.json({id:o.id,total:o.total})});
const sessions=new Set(),fails={},h=x=>crypto.createHash('sha256').update(String(x)).digest();
app.post('/api/admin/login',(q,s)=>{const f=fails[q.ip]||{n:0,t:0};if(Date.now()-f.t>9e5)f.n=0;if(f.n>=5)return s.sendStatus(429);
 if(crypto.timingSafeEqual(h((q.body||{}).password),h(PW))){const t=crypto.randomBytes(24).toString('hex');sessions.add(t);return s.json({token:t})}
 fails[q.ip]={n:f.n+1,t:Date.now()};s.sendStatus(401)});
app.use('/api/admin',(q,s,n)=>sessions.has(q.get('x-token'))?n():s.sendStatus(401));
const pick=(o,b)=>{['c','ic','n','d','b'].forEach(k=>{if(typeof b[k]==='string')o[k]=b[k].slice(0,300)});if(b.p!==undefined)o.p=Math.max(0,Number(b.p)||0);if(b.on!==undefined)o.on=!!b.on;if(b.t!==undefined)o.t=b.t?1:0;return o};
app.get('/api/admin/orders',(q,s)=>s.json(db.orders));
app.patch('/api/admin/orders/:id',(q,s)=>{const o=db.orders.find(x=>x.id===q.params.id);if(!o||!['pending','paid','done','rejected'].includes(q.body.status))return s.sendStatus(400);o.status=q.body.status;save();s.json(o)});
app.get('/api/admin/products',(q,s)=>s.json(db.products));
app.post('/api/admin/products',(q,s)=>{const p=pick({id:Math.max(0,...db.products.map(x=>x.id))+1,c:'vip',ic:'⭐',n:'منتج جديد',d:'',p:0,b:'',t:0,on:false},q.body||{});db.products.push(p);save();s.json(p)});
app.put('/api/admin/products/:id',(q,s)=>{const p=db.products.find(x=>x.id==q.params.id);if(!p)return s.sendStatus(404);pick(p,q.body||{});save();s.json(p)});
app.delete('/api/admin/products/:id',(q,s)=>{db.products=db.products.filter(x=>x.id!=q.params.id);save();s.json({ok:1})});
app.get('/api/admin/settings',(q,s)=>s.json(db.settings));
app.put('/api/admin/settings',(q,s)=>{const t=db.settings,b=q.body||{};['name','discord','wa'].forEach(k=>{if(typeof b[k]==='string')t[k]=b[k].slice(0,200)});
 if(Array.isArray(b.pay))t.pay=b.pay.map(p=>({id:String(p.id).slice(0,20),n:String(p.n).slice(0,40),ic:String(p.ic||'💳').slice(0,4),info:String(p.info||'').slice(0,200)}));save();s.json(t)});
app.get('/admin',(q,s)=>s.sendFile(path.join(__dirname,'public/admin.html')));
app.listen(PORT,()=>console.log('running on '+PORT));
