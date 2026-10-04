'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Em DEV usa a porta direta 8000; em produção/Nginx usa a rota relativa /api/health/
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/health/`)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao comunicar com a API');
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Painel de Status da Aplicação</h1>
      {error && <p style={{ color: 'red' }}>Erro: {error}</p>}
      {!data && !error && <p>Carregando dados da API...</p>}
      {data && (
        <div>
          <p><strong>Status da API:</strong> {data.status}</p>
          <h3>Tarefas Pendentes:</h3>
          <ul>
            {data.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}