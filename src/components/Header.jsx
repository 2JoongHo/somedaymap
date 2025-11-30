// src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';

// App.jsx로부터 필요한 props를 받는다.
// openPlaceModal, openSearchModal, openSettingsModal: 해당 모달을 여는 함수
// closeAllModals: 열려있는 모든 UI 요소를 닫는 함수
function Header({ openPlaceModal, openSearchModal, openSettingsModal, closeAllModals }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 메뉴 드롭다운의 열림/닫힘 상태
  const menuRef = useRef(null); // <nav class="main-menu"> 요소를 참조하기 위한 ref
  const menuButtonRef = useRef(null); // 메뉴 토글 버튼을 참조하기 위한 ref

  // ⭐️ useEffect: 문서 클릭 시 메뉴 닫기 로직 ⭐️
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 메뉴가 열려 있을 때만 외부 클릭 감지
      if (isMenuOpen) {
        // 클릭된 영역이 메뉴 드롭다운 내부나 메뉴 토글 버튼 내부가 아니라면 메뉴를 닫는다.
        if (
          menuRef.current && !menuRef.current.contains(event.target) && // 메뉴 자체 밖을 클릭했고
          menuButtonRef.current && !menuButtonRef.current.contains(event.target) // 메뉴 토글 버튼 밖을 클릭했다면
        ) {
          setIsMenuOpen(false); // 메뉴 닫기
        }
      }
    };

    // 문서에 'mousedown' 이벤트 리스너를 등록한다.
    // 'mousedown'은 'click'보다 먼저 발생하며, 요소의 포커스 변경과 관련이 깊어 외부 클릭 감지에 좋다.
    document.addEventListener('mousedown', handleClickOutside);

    // 컴포넌트가 언마운트되거나 isMenuOpen 상태가 변경될 때 이벤트 리스너를 정리한다.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]); // isMenuOpen 상태가 변경될 때마다 Effect를 재실행 (클로저 문제 방지)

  // ⭐️ 메뉴 토글 버튼 클릭 핸들러 ⭐️
  const handleMenuToggle = () => {
    // 메뉴가 현재 닫혀있고, 이제 열릴 예정이라면 다른 모든 모달을 닫는다.
    // 이렇게 하면 메뉴와 다른 모달이 동시에 열리는 것을 방지하고, UI 일관성을 유지한다.
    if (!isMenuOpen) { 
      closeAllModals(); // App.jsx의 closeAllModals 호출
    }
    // 메뉴 상태를 토글한다.
    setIsMenuOpen(prev => !prev);
  };

  // ⭐️ 검색 버튼 클릭 핸들러 ⭐️
  const handleSearchButtonClick = () => {
    closeAllModals(); // App.jsx의 closeAllModals 호출 (메뉴 포함 모든 모달 닫기)
    openSearchModal(); // App.jsx에서 받은 openSearchModal 함수 호출
  };

  // ⭐️ '내 장소' 버튼 클릭 핸들러 ⭐️
  const handlePlaceButtonClick = () => {
    // 메뉴가 열려있다면 닫아준다.
    if (isMenuOpen) setIsMenuOpen(false); 
    openPlaceModal(); // App.jsx에서 받은 openPlaceModal 함수 호출
  };

  // ⭐️ '로그인' 버튼 클릭 핸들러 ⭐️
  const handleLoginButtonClick = () => {
    if (isMenuOpen) setIsMenuOpen(false); // 메뉴가 열려있다면 닫아준다.
    alert("로그인 기능은 곧 추가됩니다."); // 임시 알림
  };

  // ⭐️ '설정' 버튼 클릭 핸들러 ⭐️
  const handleSettingsButtonClick = () => {
    if (isMenuOpen) setIsMenuOpen(false); // 메뉴가 열려있다면 닫아준다.
    openSettingsModal(); // App.jsx에서 받은 openSettingsModal 함수 호출
  };

  return (
    <header>
      <h1>
        {/* React 환경에서 public 폴더의 에셋을 참조할 때는 절대 경로 '/'를 사용한다. */}
        {/* <img src="/src/assets/icon/logo5.svg" alt="logo" /> */} 
        <span>언제<span className="h1-gal">갈</span>지도</span>
      </h1>

      {/* 메뉴 토글 버튼 */}
      <button 
        id="menuToggleButton" 
        className="menu-toggle-btn" 
        onClick={handleMenuToggle}
        ref={menuButtonRef} // 버튼에 ref 연결
      >
        {/* 이미지 경로 조정: public 폴더 기준으로 접근하거나, App.jsx에서 import하여 전달해야 한다. */}
        {/* 지금은 없다고 가정하고, 나중에 에셋 추가 시 수정 */}
        {/* <img src="/assets/icon/menuIcon.svg" alt="메뉴" /> */}
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6H20M4 12H20M4 18H20" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg> {/* 임시 SVG 아이콘 */}
      </button>

      {/* 검색 버튼 */}
      <button 
        id="openSearchModalBtn" 
        className="search-toggle-btn" 
        onClick={handleSearchButtonClick}
      >
        {/* 이미지 경로 조정 */}
        {/* <img src="/assets/icon/searchIcon3.svg" alt="검색" /> */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 21L16.65 16.65" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg> {/* 임시 SVG 아이콘 */}
      </button>

      {/* 상단 메뉴창 (드롭다운) */}
      <nav 
        className={`main-menu ${isMenuOpen ? 'show' : ''}`} // isMenuOpen 상태에 따라 'show' 클래스 토글
        ref={menuRef} // 메뉴 nav 요소에 ref 연결
      >
        <ul id="mainMenu" className="menu-items">
          <li><button id="placeBtn" onClick={handlePlaceButtonClick}>내 장소</button></li>
          <li><button id="loginBtn" onClick={handleLoginButtonClick}>로그인</button></li>
          <li><button id="settingsBtn" onClick={handleSettingsButtonClick}>설정</button></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;