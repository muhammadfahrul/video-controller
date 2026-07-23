import { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';

export function AddRoomForm() {
  const addRoom = useRoomStore((state) => state.addRoom);
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('53331');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !ip.trim()) {
      alert('Nama ruangan dan IP wajib diisi');
      return;
    }
    
    addRoom({
      name: name.trim(),
      ip: ip.trim(),
      port: parseInt(port, 10) || 53331,
    });
    
    // Reset form
    setName('');
    setIp('');
    setPort('53331');
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="btn btn-primary"
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          borderRadius: '8px',
        }}
      >
        + Tambah Ruangan
      </button>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Tambah Ruangan</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Nama Ruangan *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Room 1, Ruang Tamu, dll"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            IP Address *
          </label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Contoh: 192.168.1.10"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Port
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="53331"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          />
          <small style={{ color: '#666' }}>Default: 53331</small>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              borderRadius: '6px',
            }}
          >
            Simpan
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="btn"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              borderRadius: '6px',
              background: '#f0f0f0',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
