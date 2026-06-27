# Agro Jump — نظام التكلفة والمخزون

نظام ويب لإدارة تكلفة المنتجات ومخزون الخامات لشركة أدوية زراعية.
الفكرة الأساسية: **تغيّر سعر أي خامة → تتحدّث تكلفة كل منتج فيها تلقائيًا.**

نوعان للدخول:
- **المصنع (factory):** الخامات، التركيبات، الشراء، الصرف، الإنتاج.
- **المحل (store):** مخزون المنتجات، البيع.

---

## بيانات الدخول (غيّرها بعد أول تجربة)

| النوع | المستخدم | كلمة المرور |
|------|----------|-------------|
| المصنع | `factory` | `factory123` |
| المحل  | `store`   | `store123` |

---

## التشغيل محليًا
أي سيرفر static يكفي (الملفات HTML/JS فقط، بدون build):
```bash
python3 -m http.server 8080
# افتح http://localhost:8080
```

---

## الرفع على GitHub
```bash
cd agro-jump
git init
git add .
git commit -m "Agro Jump — initial"
git branch -M main
git remote add origin https://github.com/mohamedmaged215/agro-jump.git
git push -u origin main
```

## النشر على Vercel
1. ادخل vercel.com → **Add New → Project**.
2. اختر مستودع `agro-jump`.
3. **Framework Preset:** Other — لا يوجد build command ولا output directory (موقع static).
4. **Deploy**. خلاص الموقع شغّال.

> لا حاجة لمتغيرات بيئة — مفتاح Supabase العام موجود في `config.js` (publishable key، آمن للواجهة لأن الحماية على مستوى قاعدة البيانات RLS).

---

## الملفات
| الملف | الوظيفة |
|------|---------|
| `index.html` | صفحة الدخول |
| `app.html` | هيكل التطبيق |
| `app.js` | كل المنطق والموديولز |
| `styles.css` | التصميم (RTL) |
| `config.js` | رابط ومفتاح Supabase |
| `schema.sql` | بنية قاعدة البيانات (مرجع — مُطبّقة بالفعل) |

---

## قاعدة البيانات (مُطبّقة على Supabase)
جداول بالبادئة `agro_`: `agro_materials`, `agro_products`, `agro_recipe`, `agro_movements`, `agro_users`.
العروض (محسوبة لحظيًا): `agro_material_stock`, `agro_product_stock`, `agro_product_cost`.
دوال: `agro_record_purchase` (شراء يرفع الرصيد ويحدّث السعر)، `agro_login` (الدخول).

### إضافة/تعديل مستخدم
```sql
insert into agro_users(username, password_hash, role)
values ('myuser', crypt('mypassword', gen_salt('bf')), 'factory');
-- النوع: 'factory' أو 'store'
```

---

## ملاحظات للتطوير لاحقًا
- الجرد متاح كزر «جرد» في الخامات (يسجّل فرق التسوية). يمكن توسيعه لتقرير هادر كامل.
- الحماية الحالية مبسّطة (مناسبة لأداة داخلية). للتشديد لاحقًا: ربط الأدوار بـ Supabase Auth وسياسات RLS أدق.
- النظام مبني ليكون مرنًا — أي موديول جديد يُضاف دون كسر الباقي.
