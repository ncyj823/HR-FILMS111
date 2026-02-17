import React from 'react';

const generateQRMatrix = (text: string) => {
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i) * (i + 1);
  const rand = () => { const x = Math.sin(seed++) * 10000; return x - Math.floor(x); };
  const size = 21;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  
  const finder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4))
        matrix[r + i][c + j] = 1;
    }
  };
  finder(0, 0); finder(0, 14); finder(14, 0);
  
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    if (matrix[i][j] === 0) matrix[i][j] = rand() > 0.45 ? 1 : 0;
  }
  return matrix;
};

const BeautifulQR: React.FC<{ value: string }> = ({ value }) => {
  const qrMatrix = generateQRMatrix(value);

  return (
    <>
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        .qr-scan-line { animation: scanline 2.5s ease-in-out infinite; }
      `}</style>

      <div style={{ position: "relative", padding: 12, background: "#fff",
        borderRadius: 12, border: "2px solid #111",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>

        {/* Scan line */}
        <div className="qr-scan-line" style={{
          position: "absolute", left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(220,38,38,0.8), transparent)",
          zIndex: 10, pointerEvents: "none",
        }} />

        {/* Corner accents */}
        {([[0,0,'top','left'],[0,1,'top','right'],[1,0,'bottom','left']] as const).map(([t,r,tv,rv], i) => (
          <div key={i} style={{
            position: "absolute",
            top: tv === 'top' ? 6 : 'auto', bottom: tv === 'bottom' ? 6 : 'auto',
            left: rv === 'left' ? 6 : 'auto', right: rv === 'right' ? 6 : 'auto',
            width: 16, height: 16,
            borderTop: tv === 'top' ? "3px solid #dc2626" : "none",
            borderBottom: tv === 'bottom' ? "3px solid #dc2626" : "none",
            borderLeft: rv === 'left' ? "3px solid #dc2626" : "none",
            borderRight: rv === 'right' ? "3px solid #dc2626" : "none",
          }} />
        ))}

        {/* QR Matrix */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(21, 7px)", gap: 1 }}>
          {qrMatrix.map((row, i) =>
            row.map((cell, j) => (
              <div key={`${i}-${j}`} style={{
                width: 7, height: 7, borderRadius: 1,
                background: cell ? "#111" : "transparent",
              }} />
            ))
          )}
        </div>

        {/* Center HR logo */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 26, height: 26, background: "#dc2626",
          borderRadius: 5, display: "flex", alignItems: "center",
          justifyContent: "center", border: "2px solid #fff",
          boxShadow: "0 2px 8px rgba(220,38,38,0.5)",
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>HR</span>
        </div>
      </div>
    </>
  );
};

export default BeautifulQR;