const KeepAlive = ({ active, children }) => (
  <div
    style={{
      display: active ? 'block' : 'none',
      height: active ? 'auto' : 0,
      overflow: 'hidden',
      pointerEvents: active ? 'auto' : 'none',
    }}
  >
    {children}
  </div>
);

export default KeepAlive;
