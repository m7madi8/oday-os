import { useState } from 'react';
import { palestinianBanks } from '../data/palestinianBanks';
import { ChequePreview } from '../components/cheques/ChequePreview';
import { resolveChequeTemplate } from '../lib/cheques/templates/registry';
import { genericManagementTemplate } from '../lib/cheques/templates/genericManagement';

const sampleBanks = palestinianBanks.slice(0, 4);

export function ChequeDesignGallery() {
  const [direction, setDirection] = useState('outgoing');
  const [printKind, setPrintKind] = useState('management');
  const [logoMode, setLogoMode] = useState('color');
  const [bankId, setBankId] = useState(sampleBanks[0]?.id);

  const bank = palestinianBanks.find((b) => b.id === bankId) || sampleBanks[0];
  const template = resolveChequeTemplate(bank);

  const data = {
    amount: direction === 'outgoing' ? '999999999.99' : '25000',
    currency: 'ILS',
    payee: 'شركة النور للمقاولات General Contracting Ltd',
    issueDate: '2026-03-01',
    dueDate: '2026-04-15',
    date: '2026-03-01',
    chequeNumber: '004281',
    accountMasked: '•••• 4821',
    memo: 'مشروع 12',
    drawer: 'عدي أبو ضحى',
    bank,
  };

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold">معرض تصميم الشيك (تطوير فقط)</h1>
      <div className="flex flex-wrap gap-2">
        <select value={bankId} onChange={(e) => setBankId(e.target.value)} className="min-h-11 px-3 rounded-lg">
          {palestinianBanks.map((b) => (
            <option key={b.id} value={b.id}>{b.nameAr}</option>
          ))}
        </select>
        <select value={direction} onChange={(e) => setDirection(e.target.value)} className="min-h-11 px-3 rounded-lg">
          <option value="incoming">وارد</option>
          <option value="outgoing">صادر</option>
        </select>
        <select value={printKind} onChange={(e) => setPrintKind(e.target.value)} className="min-h-11 px-3 rounded-lg">
          <option value="management">طباعة إدارية</option>
          <option value="bank-paper">ورق بنك (نص فقط)</option>
        </select>
        <select value={logoMode} onChange={(e) => setLogoMode(e.target.value)} className="min-h-11 px-3 rounded-lg">
          <option value="color">شعار ملون</option>
          <option value="mono">شعار أحادي</option>
        </select>
      </div>
      <ChequePreview
        direction={direction}
        data={data}
        template={template.verified ? template : genericManagementTemplate}
        mode={printKind === 'bank-paper' ? 'print' : 'screen'}
        printKind={printKind}
        logoMode={logoMode}
        zoom={1.2}
      />
      <p className="text-sm opacity-70">
        لا توجد ملفات شعار مرفقة في المستودع — يظهر الاحتياطي (الأحرف الأولى) لكل بنك بدون ملف.
      </p>
    </div>
  );
}
