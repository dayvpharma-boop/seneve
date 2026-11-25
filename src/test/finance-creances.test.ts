vi.mock('@/lib/supabase',()=>({supabase:{rpc:vi.fn()}}));
import {describe,it,expect,vi} from 'vitest';
import {analyserCreances,resteCreance,type Creance} from '@/lib/finance-creances';
const id='00000000-0000-4000-8000-000000000001';
const pret=(currency='USD'):Creance=>({loan_id:id,borrower:'Paul',amount:'100.00',currency,loan_date:'2026-11-01',due_date:null,payments:[]});
describe('On me doit',()=>{
 it('réduit le solde au fil des remboursements partiels',()=>{const l=pret();l.payments=[{payment_id:id,amount:'30.00',payment_date:'2026-11-02'},{payment_id:id,amount:'20.00',payment_date:'2026-11-03'}];expect(resteCreance(l)).toBe(5000);expect(analyserCreances({enrollment_id:id,loans:[l]}).loans).toHaveLength(1);});
 it('accepte les montants entiers renvoyés avec deux décimales pour le FCFA',()=>{expect(analyserCreances({enrollment_id:id,loans:[pret('XOF')]}).loans).toHaveLength(1);});
 it('refuse un solde négatif et une réponse corrompue',()=>{const l=pret();l.payments=[{payment_id:id,amount:'101.00',payment_date:'2026-11-02'}];expect(()=>analyserCreances({enrollment_id:id,loans:[l]})).toThrow();expect(()=>analyserCreances({})).toThrow();});
});
