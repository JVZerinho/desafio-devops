'use client';
import { useState, useEffect } from 'react';
import { getDashboardData } from '../lib/firebase';

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardData()
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
      <h3>Ola</h3>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
