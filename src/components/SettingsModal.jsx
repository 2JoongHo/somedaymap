// 📁 src/components/SettingsModal.jsx
export default function SettingsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div id="settingsModal" className="placeModal">
      <div className="modal-content">
        <h2>앱 설정</h2>

        <div className="settings-group">
          <h3>지오펜싱 & 위치</h3>

          <div className="setting-item">
            <span>새 장소 알림 반경</span>
            <input type="number" defaultValue={1000} min="10" max="5000" step="10"/>m
          </div>

          <div className="setting-item">
            <span>장소 진입 알림</span>
            <label className="switch">
              <input type="checkbox" defaultChecked/>
              <span className="slider round"></span>
            </label>
          </div>

          <div className="setting-item">
            <span>장소 이탈 알림</span>
            <label className="switch">
              <input type="checkbox" defaultChecked/>
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <button id="closeSettingsModal" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
