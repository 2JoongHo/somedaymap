// src/components/modals/SettingsModal.jsx
import React, { useEffect, useState } from 'react';

// App.jsx로부터 필요한 props를 받는다.
// isOpen: 모달의 열림/닫힘 상태 (boolean)
// onClose: 모달을 닫는 함수
// appSettings: 현재 앱 설정 데이터 (Object)
// setAppSettings: 앱 설정을 업데이트하는 함수 (App.jsx의 useState Setter)
function SettingsModal({ isOpen, onClose, appSettings, setAppSettings }) {
  // 모달 내부에서 변경 중인 설정값을 관리하기 위한 임시 상태
  const [currentSettings, setCurrentSettings] = useState(appSettings);

  // ⭐️ appSettings prop이 변경될 때마다 currentSettings를 동기화 ⭐️
  // (예: 모달을 닫았다 다시 열 때 최신 appSettings를 반영)
  useEffect(() => {
    setCurrentSettings(appSettings);
  }, [appSettings]);

  // ⭐️ 기본 알림 반경 입력값 변경 핸들러 ⭐️
  const handleDefaultRadiusChange = (e) => {
    let value = parseInt(e.target.value, 10);
    // 입력값이 유효하지 않으면 0으로 처리 (저장 시 App.jsx에서 최종 검증)
    if (isNaN(value)) value = 0; 

    setCurrentSettings(prev => ({
      ...prev,
      defaultRadius: value,
    }));
  };

  // ⭐️ 알림 토글 버튼 변경 핸들러 ⭐️
  const handleToggleChange = (settingKey) => (e) => {
    setCurrentSettings(prev => ({
      ...prev,
      [settingKey]: e.target.checked,
    }));
  };

  // ⭐️ 모달 닫기 버튼 또는 외부 클릭 핸들러 ⭐️
  const handleClose = () => {
    // 모달을 닫기 전에, currentSettings를 최종적으로 App.jsx의 appSettings에 반영
    // App.jsx에서 setAppSettings 함수는 이미 변경된 설정을 localStorage에 저장하도록 useEffect로 연결되어 있음.
    setAppSettings(currentSettings); // App.jsx의 상태를 업데이트
    onClose(); // 모달 닫기
  };

  // ⭐️ 모달 외부 클릭 시 닫기 ⭐️
  const handleModalOverlayClick = (event) => {
    if (event.target.id === 'settingsModal') { // 모달 배경 클릭 시
      handleClose(); // 설정값 저장 후 모달 닫기
    }
  };

  // isOpen 상태에 따라 모달을 표시하거나 숨긴다.
  if (!isOpen) return null;

  return (
    <div id="settingsModal" className="placeModal" style={{ display: isOpen ? 'flex' : 'none' }} onClick={handleModalOverlayClick}>
      <div className="modal-content">
        <h2>앱 설정</h2>
        <div className="settings-group">
          <h3>지오펜싱 & 위치</h3>
          <div className="setting-item">
            <span>새 장소 기본 알림 반경</span>
            <input 
              type="number" 
              id="defaultRadiusInput" 
              value={currentSettings.defaultRadius} // currentSettings 값 사용
              onChange={handleDefaultRadiusChange} // 변경 핸들러 연결
              min="10" 
              max="5000" 
              step="10"
            />m
          </div>
          <div className="setting-item">
            <span>장소 진입 시 알림</span>
            <label className="switch">
              <input 
                type="checkbox" 
                id="notifyOnEnterToggle" 
                checked={currentSettings.notifyOnEnter} // currentSettings 값 사용
                onChange={handleToggleChange('notifyOnEnter')} // 변경 핸들러 연결
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-item">
            <span>장소 이탈 시 알림</span>
            <label className="switch">
              <input 
                type="checkbox" 
                id="notifyOnExitToggle" 
                checked={currentSettings.notifyOnExit} // currentSettings 값 사용
                onChange={handleToggleChange('notifyOnExit')} // 변경 핸들러 연결
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
        <button id="closeSettingsModal" className="modal-close-btn" onClick={handleClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

export default SettingsModal;