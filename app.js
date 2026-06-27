import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===== الحراسة ===== */
const role = sessionStorage.getItem('agro_role');
if (!role) location.replace('index.html');

/* ===== أدوات ===== */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => `${(+n).toFixed(2)} ج`;
const qty   = n => parseFloat((+n).toFixed(4)).toString();

function toast(msg, isErr=false){
  const t=$('#toast'); t.textContent=msg; t.className='toast show'+(isErr?' err':'');
  setTimeout(()=>t.className='toast',2800);
}
function fdate(ts){
  const d=new Date(ts);
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
}

/* تأكيد حذف — dialog بسيط */
function confirm_del(msg){ return confirm(`⚠️ ${msg}\n\nهذا الإجراء لا يمكن التراجع عنه.`); }

const ICON={
  dash:'<path d="M3 13h8V3H3z"/><path d="M13 21h8V11h-8z"/><path d="M13 3h8v6h-8z"/><path d="M3 17h8v4H3z"/>',
  mat:'<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
  buy:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 13h11"/><path d="M6 6h15l-1.5 8H7"/>',
  issue:'<path d="M21 12H7"/><path d="M11 6l-6 6 6 6"/><path d="M21 4v16"/>',
  prod:'<path d="M3 21h18"/><path d="M5 21V8l5 3V8l5 3V8l4 3v10"/>',
  factory:'<path d="M3 21h18V10l-6 4V10l-6 4V5H3z"/>',
  sale:'<path d="M3 3h2l2.5 13h11"/><path d="M6 6h15l-1.5 8H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
  store:'<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
  move:'<path d="M7 7h14"/><path d="M7 7l4-4M7 7l4 4"/><path d="M17 17H3"/><path d="M17 17l-4-4M17 17l-4 4"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  del:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>',
};
const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

/* ===== شريط المستخدم ===== */
$('#roleBadge').textContent = role==='factory'?'المصنع':'المحل';
$('#roleBadge').className = 'role-badge'+(role==='store'?' store':'');
$('#logout').addEventListener('click',()=>{ sessionStorage.clear(); location.replace('index.html'); });

/* ===== القائمة ===== */
const NAV = role==='factory' ? [
  {sec:'المتابعة'},
  {k:'dashboard',   t:'لوحة المتابعة',      i:'dash'},
  {sec:'المخزون والتكلفة'},
  {k:'materials',   t:'الخامات',             i:'mat'},
  {k:'products',    t:'المنتجات والتركيبة', i:'prod'},
  {sec:'عمليات المصنع'},
  {k:'purchase',    t:'شراء خامات',          i:'buy'},
  {k:'issue',       t:'صرف خامات',           i:'issue'},
  {k:'production',  t:'تسجيل إنتاج',         i:'factory'},
  {sec:'السجل'},
  {k:'movements',   t:'كل الحركات',          i:'move'},
] : [
  {sec:'المحل'},
  {k:'store_products', t:'مخزون المنتجات', i:'store'},
  {k:'sale',           t:'تسجيل بيع',      i:'sale'},
  {sec:'السجل'},
  {k:'movements',      t:'كل الحركات',     i:'move'},
];

const openRecipes = new Set();
const ROUTES={dashboard,materials,products,purchase,issue,production,store_products,sale,movements};

function renderNav(active){
  $('#nav').innerHTML=NAV.map(n=>n.sec
    ?`<div class="nav-sec">${n.sec}</div>`
    :`<button class="nav-item ${n.k===active?'active':''}" data-k="${n.k}">${ic(n.i)}<span class="lbl">${n.t}</span></button>`
  ).join('');
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>go(b.dataset.k)));
}
function go(k){ renderNav(k); $('#view').innerHTML='<div class="empty">جاري التحميل…</div>'; (ROUTES[k]||dashboard)(); }

/* ===== جلب البيانات ===== */
const getMaterials = ()=>sb.from('agro_material_stock').select('*').order('name');
const getProdCost  = ()=>sb.from('agro_product_cost').select('*').order('name');
const getProdStock = ()=>sb.from('agro_product_stock').select('*').order('name');

/* ========== لوحة المتابعة ========== */
async function dashboard(){
  const [{data:mats},{data:prods}]=await Promise.all([getMaterials(),getProdCost()]);
  const lowMats=(mats||[]).filter(m=>+m.balance_kg<=+m.low_stock&&+m.low_stock>0);
  const stockVal=(mats||[]).reduce((s,m)=>s+(+m.balance_kg*+m.price_per_kg),0);
  $('#view').innerHTML=`
    <div class="page-head"><h1>لوحة المتابعة</h1><p>نظرة سريعة على الخامات والتكاليف.</p></div>
    <div class="cards">
      <div class="stat"><div class="k">${ic('mat')} عدد الخامات</div><div class="v">${(mats||[]).length}</div></div>
      <div class="stat"><div class="k">${ic('prod')} عدد المنتجات</div><div class="v">${(prods||[]).length}</div></div>
      <div class="stat"><div class="k">${ic('store')} قيمة مخزون الخامات</div><div class="v">${stockVal.toFixed(0)}<small> ج</small></div></div>
      <div class="stat ${lowMats.length?'alert':''}"><div class="k">${ic('issue')} خامات تحت الحد</div><div class="v">${lowMats.length}</div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>تكلفة وربح المنتجات</h2><span class="pill ok">تُحسب لحظيًا</span></div>
      <div class="panel-body" style="padding:0">
        ${(prods||[]).length?`<table><thead><tr><th>المنتج</th><th>التكلفة</th><th>سعر البيع</th><th>الربح</th></tr></thead><tbody>
          ${prods.map(p=>`<tr><td>${esc(p.name)}</td>
            <td><span class="cost-cell">${money(p.cost)}</span></td>
            <td class="num">${money(p.sale_price)}</td>
            <td class="num ${(+p.profit>=0)?'profit-pos':'profit-neg'}">${money(p.profit)}</td></tr>`).join('')}
        </tbody></table>`:`<div class="empty">لا توجد منتجات بعد.</div>`}
      </div>
    </div>
    ${lowMats.length?`<div class="panel"><div class="panel-head"><h2>تنبيه: خامات قاربت على النفاد</h2></div>
      <div class="panel-body" style="padding:0"><table><thead><tr><th>الخامة</th><th>الرصيد</th><th>الحد</th></tr></thead><tbody>
      ${lowMats.map(m=>`<tr><td>${esc(m.name)}</td><td class="num">${qty(m.balance_kg)} كجم</td><td class="num muted">${qty(m.low_stock)} كجم</td></tr>`).join('')}
      </tbody></table></div></div>`:''}`;
}

/* ========== الخامات ========== */
async function materials(){
  const {data:mats}=await getMaterials();
  $('#view').innerHTML=`
    <div class="page-head"><h1>الخامات</h1><p>عدّل السعر أو الاسم — يتغيّر فورًا في كل المنتجات.</p></div>
    <div class="panel">
      <div class="panel-head"><h2>إضافة خامة جديدة</h2></div>
      <div class="panel-body"><div class="form-grid">
        <div class="field"><label>اسم الخامة</label><input id="m_name" placeholder="مثال: يوريا"></div>
        <div class="field"><label>سعر الكيلو (ج)</label><input id="m_price" type="number" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>حد التنبيه (كجم)</label><input id="m_low" type="number" step="0.001" placeholder="0"></div>
        <button class="btn btn-green" id="m_add">إضافة الخامة</button>
      </div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>قائمة الخامات</h2></div>
      <div class="panel-body" style="padding:0">
        ${(mats||[]).length?`<table><thead><tr>
          <th>الخامة</th><th>سعر الكيلو</th><th>الرصيد</th><th>الحالة</th><th>إجراءات</th>
        </tr></thead><tbody>
          ${mats.map(m=>{
            const low=+m.balance_kg<=+m.low_stock&&+m.low_stock>0;
            return `<tr data-id="${m.id}">
              <td>
                <span class="name-display">${esc(m.name)}</span>
                <span class="name-edit" style="display:none">
                  <input class="inline-input name-inp" value="${esc(m.name)}" style="width:120px">
                  <button class="btn-sm btn-green save-name">حفظ</button>
                  <button class="btn-sm btn-ghost cancel-name">إلغاء</button>
                </span>
              </td>
              <td><input class="inline-input price" type="number" step="0.01" value="${m.price_per_kg}"> <button class="btn-sm btn-ghost save-price">حفظ</button></td>
              <td class="num bal">${qty(m.balance_kg)} كجم</td>
              <td><span class="pill ${low?'low':'ok'}">${low?'تحت الحد':'متاح'}</span></td>
              <td style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <button class="btn-sm btn-ghost edit-name" title="تعديل الاسم">${ic('edit')}</button>
                <button class="btn-sm btn-ghost jard">جرد</button>
                <button class="btn-sm btn-danger del-mat" title="حذف الخامة">${ic('del')}</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody></table>`:`<div class="empty">لا توجد خامات بعد.</div>`}
      </div>
    </div>`;

  $('#m_add').addEventListener('click',async()=>{
    const name=$('#m_name').value.trim(),price=parseFloat($('#m_price').value)||0,low=parseFloat($('#m_low').value)||0;
    if(!name){toast('اكتب اسم الخامة.',true);return;}
    const{error}=await sb.from('agro_materials').insert({name,price_per_kg:price,low_stock:low});
    if(error){toast('تعذّر الحفظ.',true);return;}
    toast('تمت إضافة الخامة.'); materials();
  });

  $$('#view tr[data-id]').forEach(tr=>{
    const id=tr.dataset.id;

    /* تعديل الاسم */
    tr.querySelector('.edit-name').addEventListener('click',()=>{
      tr.querySelector('.name-display').style.display='none';
      tr.querySelector('.name-edit').style.display='inline-flex';
      tr.querySelector('.name-inp').focus();
    });
    tr.querySelector('.cancel-name').addEventListener('click',()=>{
      tr.querySelector('.name-display').style.display='';
      tr.querySelector('.name-edit').style.display='none';
    });
    tr.querySelector('.save-name').addEventListener('click',async()=>{
      const name=tr.querySelector('.name-inp').value.trim();
      if(!name){toast('الاسم لا يمكن أن يكون فارغًا.',true);return;}
      const{error}=await sb.from('agro_materials').update({name}).eq('id',id);
      if(error){toast('تعذّر التحديث.',true);return;}
      toast('تم تحديث الاسم.'); materials();
    });

    /* تعديل السعر */
    tr.querySelector('.save-price').addEventListener('click',async()=>{
      const price=parseFloat(tr.querySelector('.price').value);
      if(isNaN(price)){toast('سعر غير صحيح.',true);return;}
      const{error}=await sb.from('agro_materials').update({price_per_kg:price}).eq('id',id);
      if(error){toast('تعذّر التحديث.',true);return;}
      tr.classList.add('flash');setTimeout(()=>tr.classList.remove('flash'),1100);
      toast('تم تحديث السعر — انعكس على كل المنتجات.');
    });

    /* جرد */
    tr.querySelector('.jard').addEventListener('click',async()=>{
      const cur=tr.querySelector('.bal').textContent;
      const v=prompt(`الجرد الفعلي للخامة (الرصيد الدفتري: ${cur})\nاكتب الكمية الفعلية بالكيلو:`);
      if(v===null)return;
      const actual=parseFloat(v);if(isNaN(actual)){toast('قيمة غير صحيحة.',true);return;}
      const book=parseFloat(cur),diff=+(actual-book).toFixed(4);
      const{error}=await sb.from('agro_movements').insert({type:'adjust_material',material_id:id,quantity:diff,note:`تسوية جرد (فعلي ${actual})`});
      if(error){toast('تعذّر تسجيل التسوية.',true);return;}
      toast(`تم ضبط الرصيد إلى ${actual} كجم.`); materials();
    });

    /* حذف */
    tr.querySelector('.del-mat').addEventListener('click',async()=>{
      const name=tr.querySelector('.name-display').textContent.trim();
      if(!confirm_del(`حذف الخامة "${name}"؟\nتأكد أنها غير مستخدمة في أي تركيبة.`))return;
      const{error}=await sb.from('agro_materials').delete().eq('id',id);
      if(error){toast(error.message?.includes('foreign')?'لا يمكن الحذف — الخامة مستخدمة في تركيبة منتج.':'تعذّر الحذف.',true);return;}
      toast('تم حذف الخامة.'); materials();
    });
  });
}

/* ========== المنتجات والتركيبة ========== */
async function products(){
  const [{data:prods},{data:mats}]=await Promise.all([getProdCost(),getMaterials()]);
  $('#view').innerHTML=`
    <div class="page-head"><h1>المنتجات والتركيبة</h1><p>عرّف خامات كل منتج وكمياتها — التكلفة تُحسب لحظيًا.</p></div>
    <div class="panel">
      <div class="panel-head"><h2>إضافة منتج جديد</h2></div>
      <div class="panel-body"><div class="form-grid">
        <div class="field"><label>اسم المنتج</label><input id="p_name" placeholder="مثال: منتج أ"></div>
        <div class="field"><label>سعر البيع (ج)</label><input id="p_price" type="number" step="0.01" placeholder="0.00"></div>
        <button class="btn btn-green" id="p_add">إضافة المنتج</button>
      </div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>المنتجات</h2></div>
      <div class="panel-body" style="padding:0">
        ${(prods||[]).length?`<table><thead><tr>
          <th>المنتج</th><th>التكلفة</th><th>سعر البيع</th><th>الربح</th><th>إجراءات</th>
        </tr></thead><tbody>
          ${prods.map(p=>`<tr data-id="${p.id}">
            <td>
              <span class="name-display">${esc(p.name)}</span>
              <span class="name-edit" style="display:none">
                <input class="inline-input name-inp" value="${esc(p.name)}" style="width:120px">
                <button class="btn-sm btn-green save-name">حفظ</button>
                <button class="btn-sm btn-ghost cancel-name">إلغاء</button>
              </span>
            </td>
            <td><span class="cost-cell">${money(p.cost)}</span></td>
            <td><input class="inline-input sale" type="number" step="0.01" value="${p.sale_price}"> <button class="btn-sm btn-ghost save-sale">حفظ</button></td>
            <td class="num ${(+p.profit>=0)?'profit-pos':'profit-neg'}">${money(p.profit)}</td>
            <td style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <button class="btn-sm btn-ghost edit-name" title="تعديل الاسم">${ic('edit')}</button>
              <button class="btn-sm btn-green recipe-btn">التركيبة</button>
              <button class="btn-sm btn-danger del-prod" title="حذف المنتج">${ic('del')}</button>
            </td>
          </tr>
          <tr class="recipe-row" data-rid="${p.id}" style="${openRecipes.has(p.id.toString()) ? '' : 'display:none'}"><td colspan="5" style="background:#FAFBFA"></td></tr>`).join('')}
        </tbody></table>`:`<div class="empty">لا توجد منتجات بعد.</div>`}
      </div>
    </div>`;

  $('#p_add').addEventListener('click',async()=>{
    const name=$('#p_name').value.trim(),price=parseFloat($('#p_price').value)||0;
    if(!name){toast('اكتب اسم المنتج.',true);return;}
    const{error}=await sb.from('agro_products').insert({name,sale_price:price});
    if(error){toast('تعذّر الحفظ.',true);return;}
    toast('تمت إضافة المنتج.'); products();
  });

  $$('#view tr[data-id]').forEach(tr=>{
    const id=tr.dataset.id;

    /* تعديل الاسم */
    tr.querySelector('.edit-name').addEventListener('click',()=>{
      tr.querySelector('.name-display').style.display='none';
      tr.querySelector('.name-edit').style.display='inline-flex';
      tr.querySelector('.name-inp').focus();
    });
    tr.querySelector('.cancel-name').addEventListener('click',()=>{
      tr.querySelector('.name-display').style.display='';
      tr.querySelector('.name-edit').style.display='none';
    });
    tr.querySelector('.save-name').addEventListener('click',async()=>{
      const name=tr.querySelector('.name-inp').value.trim();
      if(!name){toast('الاسم لا يمكن أن يكون فارغًا.',true);return;}
      const{error}=await sb.from('agro_products').update({name}).eq('id',id);
      if(error){toast('تعذّر التحديث.',true);return;}
      toast('تم تحديث اسم المنتج.'); products();
    });

    /* تعديل سعر البيع */
    tr.querySelector('.save-sale').addEventListener('click',async()=>{
      const sale=parseFloat(tr.querySelector('.sale').value);
      if(isNaN(sale)){toast('سعر غير صحيح.',true);return;}
      const{error}=await sb.from('agro_products').update({sale_price:sale}).eq('id',id);
      if(error){toast('تعذّر التحديث.',true);return;}
      toast('تم تحديث سعر البيع.'); products();
    });

    /* التركيبة */
    tr.querySelector('.recipe-btn').addEventListener('click',()=>{
      const row=$(`#view tr.recipe-row[data-rid="${id}"]`);
      if(row.style.display==='none'){
        row.style.display='';
        openRecipes.add(id.toString());
        renderRecipe(id,row.firstElementChild,mats);
      }
      else {
        row.style.display='none';
        openRecipes.delete(id.toString());
      }
    });

    /* حذف المنتج */
    tr.querySelector('.del-prod').addEventListener('click',async()=>{
      const name=tr.querySelector('.name-display').textContent.trim();
      if(!confirm_del(`حذف المنتج "${name}" وتركيبته كاملة؟`))return;
      const{error}=await sb.from('agro_products').delete().eq('id',id);
      if(error){toast('تعذّر الحذف.',true);return;}
      openRecipes.delete(id.toString());
      toast('تم حذف المنتج.'); products();
    });

    /* إعادة فتح لوحة التركيبة إذا كانت مفتوحة مسبقاً */
    if(openRecipes.has(id.toString())){
      const row=$(`#view tr.recipe-row[data-rid="${id}"]`);
      renderRecipe(id,row.firstElementChild,mats);
    }
  });
}

async function renderRecipe(pid, cell, mats){
  cell.innerHTML='<div class="empty">جاري تحميل التركيبة…</div>';
  const{data:lines}=await sb.from('agro_recipe')
    .select('id,quantity_kg,material_id,agro_materials(name,price_per_kg)')
    .eq('product_id',pid).order('id');

  const rows=(lines||[]).map(l=>{
    const lineCost=+l.quantity_kg*+l.agro_materials.price_per_kg;
    return `<div class="recipe-line" data-lid="${l.id}">
      <span class="nm">${esc(l.agro_materials.name)}</span>
      <span class="num muted" style="min-width:140px">
        <input class="inline-input rqty" type="number" step="0.0001" value="${l.quantity_kg}" style="width:80px"> كجم
        × ${money(l.agro_materials.price_per_kg)}
      </span>
      <span class="cost-cell">${money(lineCost)}</span>
      <button class="btn-sm btn-green save-rqty">حفظ</button>
      <button class="btn-sm btn-danger del-line">${ic('del')}</button>
    </div>`;
  }).join('');

  cell.innerHTML=`<div class="recipe-panel">
    <div style="font-weight:700;margin-bottom:10px">تركيبة المنتج</div>
    ${rows||'<div class="muted" style="margin-bottom:10px">لا توجد خامات في هذا المنتج بعد.</div>'}
    <div class="form-grid" style="margin-top:14px">
      <div class="field"><label>الخامة</label><select class="r_mat">${(mats||[]).map(m=>`<option value="${m.id}">${esc(m.name)} (${money(m.price_per_kg)}/كجم)</option>`).join('')}</select></div>
      <div class="field"><label>الكمية في العبوة (كجم)</label><input class="r_qty" type="number" step="0.0001" placeholder="0.25"></div>
      <button class="btn btn-green r_add">إضافة خامة</button>
    </div>
  </div>`;

  /* إضافة خامة للتركيبة */
  cell.querySelector('.r_add').addEventListener('click',async()=>{
    const material_id=cell.querySelector('.r_mat').value;
    const quantity_kg=parseFloat(cell.querySelector('.r_qty').value);
    if(!material_id||isNaN(quantity_kg)||quantity_kg<=0){toast('اختر الخامة واكتب كمية صحيحة.',true);return;}
    const{error}=await sb.from('agro_recipe').insert({product_id:pid,material_id,quantity_kg});
    if(error){toast(error.code==='23505'?'الخامة موجودة بالفعل في التركيبة.':'تعذّر الإضافة.',true);return;}
    toast('تمت إضافة الخامة للتركيبة.');
    renderRecipe(pid,cell,mats); products();
  });

  /* تعديل كمية في التركيبة */
  cell.querySelectorAll('.save-rqty').forEach(b=>b.addEventListener('click',async()=>{
    const line=b.closest('.recipe-line');
    const lid=line.dataset.lid;
    const qty=parseFloat(line.querySelector('.rqty').value);
    if(isNaN(qty)||qty<=0){toast('كمية غير صحيحة.',true);return;}
    const{error}=await sb.from('agro_recipe').update({quantity_kg:qty}).eq('id',lid);
    if(error){toast('تعذّر التحديث.',true);return;}
    toast('تم تحديث الكمية.'); renderRecipe(pid,cell,mats); products();
  }));

  /* حذف سطر من التركيبة */
  cell.querySelectorAll('.del-line').forEach(b=>b.addEventListener('click',async()=>{
    const line=b.closest('.recipe-line');
    const lid=line.dataset.lid;
    const name=line.querySelector('.nm').textContent.trim();
    if(!confirm_del(`حذف "${name}" من التركيبة؟`))return;
    const{error}=await sb.from('agro_recipe').delete().eq('id',lid);
    if(error){toast('تعذّر الحذف.',true);return;}
    toast('تم حذف الخامة من التركيبة.'); renderRecipe(pid,cell,mats); products();
  }));
}

/* ========== شراء خامات ========== */
async function purchase(){
  const{data:mats}=await getMaterials();
  $('#view').innerHTML=`
    <div class="page-head"><h1>شراء خامات</h1><p>يرفع الرصيد ويحدّث سعر الكيلو — ينعكس فورًا على كل المنتجات.</p></div>
    <div class="panel"><div class="panel-body"><div class="form-grid">
      <div class="field"><label>الخامة</label><select id="b_mat">${(mats||[]).map(m=>`<option value="${m.id}" data-p="${m.price_per_kg}">${esc(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label>الكمية (كجم)</label><input id="b_qty" type="number" step="0.001" placeholder="0"></div>
      <div class="field"><label>سعر الكيلو الجديد (ج)</label><input id="b_price" type="number" step="0.01" placeholder="0.00"></div>
      <div class="field"><label>ملاحظة (اختياري)</label><input id="b_note" placeholder="رقم فاتورة / مورد"></div>
      <button class="btn btn-green" id="b_go">تسجيل الشراء</button>
    </div>
    <p class="muted" id="b_hint" style="margin-top:12px;font-size:.86rem"></p>
    </div></div>`;
  const hint=()=>{ const o=$('#b_mat').selectedOptions[0]; if(o) $('#b_hint').textContent=`السعر الحالي: ${money(o.dataset.p)}/كجم`; };
  $('#b_mat').addEventListener('change',hint); hint();
  $('#b_go').addEventListener('click',async()=>{
    const material_id=$('#b_mat').value,q=parseFloat($('#b_qty').value),price=parseFloat($('#b_price').value),note=$('#b_note').value.trim()||null;
    if(!material_id||isNaN(q)||q<=0||isNaN(price)||price<0){toast('املأ الكمية والسعر بشكل صحيح.',true);return;}
    const{error}=await sb.rpc('agro_record_purchase',{p_material_id:material_id,p_quantity:q,p_price_per_kg:price,p_note:note});
    if(error){toast('تعذّر تسجيل الشراء.',true);return;}
    toast('تم الشراء — الرصيد والسعر تحدّثا في كل المنتجات.'); purchase();
  });
}

/* ========== صرف خامات ========== */
async function issue(){
  const{data:mats}=await getMaterials();
  $('#view').innerHTML=`
    <div class="page-head"><h1>صرف خامات</h1><p>يُخصم من رصيد المصنع — مستقل عن الإنتاج.</p></div>
    <div class="panel"><div class="panel-body"><div class="form-grid">
      <div class="field"><label>الخامة</label><select id="i_mat">${(mats||[]).map(m=>`<option value="${m.id}" data-b="${m.balance_kg}">${esc(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label>الكمية المصروفة (كجم)</label><input id="i_qty" type="number" step="0.001" placeholder="0"></div>
      <div class="field"><label>ملاحظة (اختياري)</label><input id="i_note" placeholder="السبب / الدفعة"></div>
      <button class="btn btn-green" id="i_go">تسجيل الصرف</button>
    </div>
    <p class="muted" id="i_hint" style="margin-top:12px;font-size:.86rem"></p>
    </div></div>`;
  const hint=()=>{ const o=$('#i_mat').selectedOptions[0]; if(o) $('#i_hint').textContent=`الرصيد الحالي: ${qty(o.dataset.b)} كجم`; };
  $('#i_mat').addEventListener('change',hint); hint();
  $('#i_go').addEventListener('click',async()=>{
    const material_id=$('#i_mat').value,q=parseFloat($('#i_qty').value),note=$('#i_note').value.trim()||null;
    if(!material_id||isNaN(q)||q<=0){toast('اكتب كمية صحيحة.',true);return;}
    const{error}=await sb.from('agro_movements').insert({type:'issue',material_id,quantity:q,note});
    if(error){toast('تعذّر تسجيل الصرف.',true);return;}
    toast('تم تسجيل الصرف وخصمه من المخزن.'); issue();
  });
}

/* ========== تسجيل إنتاج ========== */
async function production(){
  const{data:prods}=await getProdStock();
  $('#view').innerHTML=`
    <div class="page-head"><h1>تسجيل إنتاج</h1><p>يُضيف العبوات المنتَجة لمخزون المحل.</p></div>
    <div class="panel"><div class="panel-body"><div class="form-grid">
      <div class="field"><label>المنتج</label><select id="r_prod">${(prods||[]).map(p=>`<option value="${p.id}" data-b="${p.balance}">${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label>الكمية المنتَجة (عبوة)</label><input id="r_qty" type="number" step="1" placeholder="0"></div>
      <div class="field"><label>ملاحظة (اختياري)</label><input id="r_note" placeholder="رقم التشغيلة"></div>
      <button class="btn btn-green" id="r_go">تسجيل الإنتاج</button>
    </div>
    <p class="muted" id="r_hint" style="margin-top:12px;font-size:.86rem"></p>
    </div></div>`;
  const hint=()=>{ const o=$('#r_prod').selectedOptions[0]; if(o) $('#r_hint').textContent=`رصيد المحل الحالي: ${qty(o.dataset.b)} عبوة`; };
  $('#r_prod').addEventListener('change',hint); hint();
  $('#r_go').addEventListener('click',async()=>{
    const product_id=$('#r_prod').value,q=parseFloat($('#r_qty').value),note=$('#r_note').value.trim()||null;
    if(!product_id||isNaN(q)||q<=0){toast('اكتب كمية صحيحة.',true);return;}
    const{error}=await sb.from('agro_movements').insert({type:'production',product_id,quantity:q,note});
    if(error){toast('تعذّر تسجيل الإنتاج.',true);return;}
    toast('تم تسجيل الإنتاج وإضافته للمحل.'); production();
  });
}

/* ========== مخزون المنتجات (المحل) ========== */
async function store_products(){
  const{data:prods}=await getProdStock();
  $('#view').innerHTML=`
    <div class="page-head"><h1>مخزون المنتجات</h1><p>الأرصدة المتاحة في المحل للبيع.</p></div>
    <div class="panel"><div class="panel-body" style="padding:0">
      ${(prods||[]).length?`<table><thead><tr><th>المنتج</th><th>الرصيد المتاح</th><th>سعر البيع</th><th>الحالة</th></tr></thead><tbody>
        ${prods.map(p=>{const low=+p.balance<=+p.low_stock&&+p.low_stock>0;
          return `<tr><td>${esc(p.name)}</td><td class="num">${qty(p.balance)} عبوة</td>
          <td class="num">${money(p.sale_price)}</td>
          <td><span class="pill ${low?'low':'ok'}">${low?'منخفض':'متاح'}</span></td></tr>`;}).join('')}
      </tbody></table>`:`<div class="empty">لا توجد منتجات بعد.</div>`}
    </div></div>`;
}

/* ========== تسجيل بيع ========== */
async function sale(){
  const{data:prods}=await getProdStock();
  $('#view').innerHTML=`
    <div class="page-head"><h1>تسجيل بيع</h1><p>تُخصم من مخزون المحل.</p></div>
    <div class="panel"><div class="panel-body"><div class="form-grid">
      <div class="field"><label>المنتج</label><select id="s_prod">${(prods||[]).map(p=>`<option value="${p.id}" data-b="${p.balance}" data-p="${p.sale_price}">${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label>الكمية المباعة (عبوة)</label><input id="s_qty" type="number" step="1" placeholder="0"></div>
      <div class="field"><label>ملاحظة (اختياري)</label><input id="s_note" placeholder="العميل / الفاتورة"></div>
      <button class="btn btn-green" id="s_go">تسجيل البيع</button>
    </div>
    <p class="muted" id="s_hint" style="margin-top:12px;font-size:.86rem"></p>
    </div></div>`;
  const hint=()=>{ const o=$('#s_prod').selectedOptions[0]; if(o) $('#s_hint').textContent=`الرصيد: ${qty(o.dataset.b)} عبوة — سعر البيع ${money(o.dataset.p)}`; };
  $('#s_prod').addEventListener('change',hint); hint();
  $('#s_go').addEventListener('click',async()=>{
    const o=$('#s_prod').selectedOptions[0],product_id=$('#s_prod').value,q=parseFloat($('#s_qty').value),note=$('#s_note').value.trim()||null;
    if(!product_id||isNaN(q)||q<=0){toast('اكتب كمية صحيحة.',true);return;}
    if(o&&q>+o.dataset.b){toast('الكمية أكبر من الرصيد المتاح.',true);return;}
    const{error}=await sb.from('agro_movements').insert({type:'sale',product_id,quantity:q,note});
    if(error){toast('تعذّر تسجيل البيع.',true);return;}
    toast('تم تسجيل البيع وخصمه من المخزون.'); sale();
  });
}

/* ========== كل الحركات ========== */
const TYPE={
  purchase:['شراء','ok'],issue:['صرف خامة','low'],production:['إنتاج','ok'],
  sale:['بيع','low'],adjust_material:['تسوية خامة','ok'],adjust_product:['تسوية منتج','ok']
};
async function movements(){
  const{data}=await sb.from('agro_movements')
    .select('id,type,quantity,unit_price,note,created_at,material_id,product_id,agro_materials(name),agro_products(name)')
    .order('created_at',{ascending:false}).limit(100);
  $('#view').innerHTML=`
    <div class="page-head"><h1>كل الحركات</h1><p>آخر 100 حركة على المخزون.</p></div>
    <div class="panel"><div class="panel-body" style="padding:0">
      ${(data||[]).length?`<table><thead><tr><th>التاريخ</th><th>النوع</th><th>الصنف</th><th>الكمية</th><th>ملاحظة</th></tr></thead><tbody>
        ${data.map(m=>{const[lbl,cls]=TYPE[m.type]||[m.type,'ok'];
          const item=m.agro_materials?.name||m.agro_products?.name||'—';
          const unit=m.material_id?'كجم':'عبوة';
          return `<tr><td class="num muted">${fdate(m.created_at)}</td>
            <td><span class="pill ${cls}">${lbl}</span></td>
            <td>${esc(item)}</td>
            <td class="num">${qty(m.quantity)} ${unit}</td>
            <td class="muted">${esc(m.note||'')}</td></tr>`;}).join('')}
      </tbody></table>`:`<div class="empty">لا توجد حركات بعد.</div>`}
    </div></div>`;
}

/* ===== إقلاع ===== */
go(NAV.find(n=>n.k).k);