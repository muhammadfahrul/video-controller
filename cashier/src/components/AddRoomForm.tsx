import { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Plus, X, Server } from 'lucide-react';

export function AddRoomForm() {
  const addRoom = useRoomStore((state) => state.addRoom);
  const setLoading = useRoomStore((state) => state.setLoading);
  const isLoading = useRoomStore((state) => state.isLoading);
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('53331');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ip.trim()) return;
    setLoading(true, 'connecting');
    try {
      await addRoom({ name: name.trim(), ip: ip.trim(), port: parseInt(port, 10) || 53331 });
      setName('');
      setIp('');
      setPort('53331');
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tambah Ruangan</span>
        <span className="sm:hidden">Tambah</span>
      </button>
    );
  }

  return (
    <div className="bg-[#1a1a2e] rounded-lg border border-purple-500/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Tambah Ruangan</h3>
        </div>
        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nama Ruangan *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Room 1"
            className="w-full px-3 py-2 bg-[#0a0a14] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">IP Address *</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.10"
            className="w-full px-3 py-2 bg-[#0a0a14] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-full px-3 py-2 bg-[#0a0a14] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button 
            type="submit" 
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Simpan
          </button>
          <button 
            type="button" 
            onClick={() => setShowForm(false)} 
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
