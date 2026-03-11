import React, { useState } from 'react';
import { useAsciiText, slant, alligator, banner, blocks, doom, isometric1, modular } from '@inkscii/react-ascii-text';

const fonts = {
  slant,
  alligator,
  banner,
  blocks,
  doom,
  isometric1,
  modular
};

function App() {
  const [text, setText] = useState('Inkscii');
  const [selectedFont, setSelectedFont] = useState('slant');
  
  const asciiTextRef = useAsciiText({
    text: text || ' ',
    font: fonts[selectedFont as keyof typeof fonts],
    animationDirection: 'horizontal',
    animationSpeed: 30,
  });

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      minHeight: '100vh'
    }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#818cf8' }}>
          Inkscii Web Font Viewer
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
          Preview Figlet fonts with React hooks.
        </p>
      </header>

      <main style={{ 
        display: 'grid', 
        gap: '2rem',
        gridTemplateColumns: '300px 1fr'
      }}>
        <section style={{ 
          backgroundColor: '#1e293b', 
          padding: '1.5rem', 
          borderRadius: '0.75rem',
          height: 'fit-content'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Custom Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Select Font
            </label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: 'white'
              }}
            >
              {Object.keys(fonts).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </section>

        <section style={{ 
          backgroundColor: '#1e293b', 
          padding: '2rem', 
          borderRadius: '0.75rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'auto',
          minHeight: '400px'
        }}>
          <pre 
            ref={asciiTextRef as React.RefObject<HTMLPreElement>} 
            style={{ 
              lineHeight: 1, 
              fontSize: '12px',
              color: '#60a5fa'
            }} 
          />
        </section>
      </main>
    </div>
  );
}

export default App;
