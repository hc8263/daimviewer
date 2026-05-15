// Vertical splitter handle. Sits between two panels and lets the user drag horizontally.
// Calls onResize(deltaPx) on every mousemove during a drag.
function Splitter({ onResize, onResizeStart, onResizeEnd, position = "right" }) {
  const [dragging, setDragging] = React.useState(false);
  const startX = React.useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    setDragging(true);
    onResizeStart && onResizeStart();
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const delta = e.clientX - startX.current;
      startX.current = e.clientX;
      onResize(delta);
    };
    const onUp = () => {
      setDragging(false);
      onResizeEnd && onResizeEnd();
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, onResize, onResizeEnd]);

  return (
    <div
      className={`dp-splitter ${dragging ? "dragging" : ""}`}
      onMouseDown={onMouseDown}
      onDoubleClick={() => onResize && onResize("reset")}
      title="드래그하여 폭 조절 · 더블클릭으로 초기화"
    >
      <span className="dp-splitter-grip" />
    </div>
  );
}
window.Splitter = Splitter;
