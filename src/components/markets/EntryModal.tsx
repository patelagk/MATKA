import React, { useState, useMemo } from 'react';
import { Market, EntryType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  X,
  Clock,
  Sparkles,
  Coins,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface EntryModalProps {
  market: Market | null;
  isOpen: boolean;
  onClose: () => void;
  onEntrySuccess?: () => void;
  onOpenAuth: () => void;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  market,
  isOpen,
  onClose,
  onEntrySuccess,
  onOpenAuth
}) => {
  const { user, refreshWallet } = useAuth();

  const [entryType, setEntryType] = useState<EntryType>('SINGLE_ANK_OPEN');
  const [selection, setSelection] = useState<string>('');
  const [stake, setStake] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

  if (!isOpen || !market) return null;

  // Multiplier logic
  const currentMultiplier = useMemo(() => {
    if (!market) return 1;
    const m = market.payoutMultipliers;
    if (entryType === 'SINGLE_ANK_OPEN' || entryType === 'SINGLE_ANK_CLOSE') {
      return m.SINGLE_ANK || 9.5;
    }
    if (entryType === 'JODI') {
      return m.JODI || 95;
    }
    if (entryType === 'PATTI_OPEN' || entryType === 'PATTI_CLOSE') {
      if (selection.length === 3) {
        const unique = new Set(selection.split(''));
        if (unique.size === 1) return m.TRIPLE_PATTI || 650;
        if (unique.size === 2) return m.DOUBLE_PATTI || 290;
        return m.SINGLE_PATTI || 145;
      }
      return m.SINGLE_PATTI || 145;
    }
    return 1;
  }, [market, entryType, selection]);

  const potentialReturn = Math.round(stake * currentMultiplier);

  const handlePresetStake = (val: number) => {
    setStake(val);
  };

  const handleSelectionInput = (val: string) => {
    setError(null);
    if (entryType === 'SINGLE_ANK_OPEN' || entryType === 'SINGLE_ANK_CLOSE') {
      if (val.length <= 1 && /^\d*$/.test(val)) setSelection(val);
    } else if (entryType === 'JODI') {
      if (val.length <= 2 && /^\d*$/.test(val)) setSelection(val);
    } else if (entryType === 'PATTI_OPEN' || entryType === 'PATTI_CLOSE') {
      if (val.length <= 3 && /^\d*$/.test(val)) setSelection(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setError(null);

    // Validation
    if (!selection) {
      setError('Please select or enter your prediction digits.');
      return;
    }

    if (entryType === 'JODI' && selection.length !== 2) {
      setError('Jodi entry must be 2 digits (e.g. 29, 05, 88).');
      return;
    }

    if ((entryType === 'PATTI_OPEN' || entryType === 'PATTI_CLOSE') && selection.length !== 3) {
      setError('Patti / Pana entry must be 3 digits (e.g. 123, 245, 777).');
      return;
    }

    if (stake < 10) {
      setError('Minimum virtual stake is 10 VC.');
      return;
    }

    if (user.virtualBalance < stake) {
      setError(`Insufficient virtual credits. You have ${user.virtualBalance.toLocaleString()} VC.`);
      return;
    }

    setLoading(true);

    try {
      const res = await api.createEntry({
        marketId: market._id,
        entryType,
        selection,
        virtualStake: stake
      });

      setSuccessReceipt(res.entry);
      await refreshWallet();
      onEntrySuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to place virtual entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-neutral-800 via-neutral-900 to-amber-950/40 p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {market.category}
              </span>
              <h3 className="font-extrabold text-white text-base sm:text-lg">{market.name}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                Close: {market.closeTime}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Virtual Demo Session</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {successReceipt ? (
            /* Success confirmation receipt */
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">Virtual Entry Placed!</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Virtual Credits locked into pending queue with immutable ledger record.
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Entry ID:</span>
                  <span className="font-mono text-amber-300">{successReceipt._id.slice(-8)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Market:</span>
                  <span className="font-semibold text-white">{successReceipt.marketName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Type & Selection:</span>
                  <span className="font-bold text-white">
                    {successReceipt.entryType.replace(/_/g, ' ')} :{' '}
                    <span className="text-amber-400 font-mono text-sm px-1.5 py-0.5 bg-amber-500/10 rounded">
                      {successReceipt.selection}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Virtual Stake:</span>
                  <span className="font-semibold text-neutral-200">
                    {successReceipt.virtualStake.toLocaleString()} VC
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Multiplier:</span>
                  <span className="font-bold text-amber-400">{successReceipt.payoutMultiplier}x</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-400 font-bold">
                  <span>Potential Virtual Return:</span>
                  <span>+{successReceipt.potentialReturn.toLocaleString()} VC</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessReceipt(null);
                    setSelection('');
                  }}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Place Another Entry
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Entry Type Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Select Virtual Game Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'SINGLE_ANK_OPEN', label: 'Single Open', mult: `${market.payoutMultipliers.SINGLE_ANK}x` },
                    { id: 'SINGLE_ANK_CLOSE', label: 'Single Close', mult: `${market.payoutMultipliers.SINGLE_ANK}x` },
                    { id: 'JODI', label: 'Jodi (Pair)', mult: `${market.payoutMultipliers.JODI}x` },
                    { id: 'PATTI_OPEN', label: 'Patti Open', mult: `${market.payoutMultipliers.SINGLE_PATTI}x+` },
                    { id: 'PATTI_CLOSE', label: 'Patti Close', mult: `${market.payoutMultipliers.SINGLE_PATTI}x+` },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setEntryType(t.id as EntryType);
                        setSelection('');
                        setError(null);
                      }}
                      className={`p-2 rounded-xl text-left border transition ${
                        entryType === t.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="text-xs font-semibold">{t.label}</div>
                      <div className="text-[10px] text-amber-400 font-bold">{t.mult}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selection Keypad / Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    {entryType.startsWith('SINGLE_ANK')
                      ? 'Choose Single Digit (0 - 9)'
                      : entryType === 'JODI'
                      ? 'Enter 2-Digit Jodi (00 - 99)'
                      : 'Enter 3-Digit Patti / Pana'}
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Multiplier: <strong className="text-amber-400">{currentMultiplier}x</strong>
                  </span>
                </div>

                {/* Single Ank Quick Number Keypad */}
                {entryType.startsWith('SINGLE_ANK') ? (
                  <div className="grid grid-cols-5 gap-1.5">
                    {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setSelection(digit)}
                        className={`h-11 rounded-xl font-mono text-base font-bold transition flex items-center justify-center border ${
                          selection === digit
                            ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/30'
                            : 'bg-neutral-950 text-white border-neutral-800 hover:bg-neutral-800'
                        }`}
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={selection}
                      onChange={(e) => handleSelectionInput(e.target.value)}
                      placeholder={entryType === 'JODI' ? 'e.g. 29' : 'e.g. 345'}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-lg font-mono font-bold text-center tracking-widest text-amber-300 placeholder-neutral-700 focus:outline-none focus:border-amber-500"
                    />
                    <div className="text-[10px] text-neutral-500 text-center mt-1">
                      {entryType === 'JODI'
                        ? 'Valid numbers: 00 to 99'
                        : 'Single Patti: 145x | Double Patti: 290x | Triple Patti: 650x'}
                    </div>
                  </div>
                )}
              </div>

              {/* Virtual Stake Selection */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Virtual Stake Amount (VC)
                  </label>
                  {user && (
                    <span className="text-[10px] text-neutral-400">
                      Balance: <strong className="text-neutral-200">{user.virtualBalance.toLocaleString()} VC</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[50, 100, 500, 1000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handlePresetStake(val)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        stake === val
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {val.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Coins className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    step="10"
                    value={stake}
                    onChange={(e) => setStake(Math.max(10, parseInt(e.target.value) || 0))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-12 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-bold">VC</span>
                </div>
              </div>

              {/* Real-time Calculation Summary Card */}
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Multiplier:</span>
                  <span className="font-semibold text-neutral-200">{currentMultiplier}x</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Virtual Stake to Lock:</span>
                  <span className="font-semibold text-neutral-200">{stake.toLocaleString()} VC</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-emerald-400 pt-1 border-t border-neutral-800">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Potential Virtual Return:
                  </span>
                  <span>+{potentialReturn.toLocaleString()} VC</span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500/70" />
                <span>Virtual demonstration entry. Balance is locked in ledger until result.</span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Locking Virtual Credits...'
                ) : user ? (
                  <>
                    <span>Place Virtual Demo Entry</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  'Sign In to Place Virtual Entry'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
