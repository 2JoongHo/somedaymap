import { useState } from "react";

export default function Menu({ onPlaceOpen, onSettingsOpen }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className={`main-menu ${open ? "show" : ""}`}>
      
      {/* 메뉴 버튼 (햄버거 아이콘) */}
      <button 
        className="menu-toggle-btn" 
        onClick={() => setOpen(prev => !prev)}
      >
        <img src="/src/assets/icon/menuIcon.svg" alt="menu" />
      </button>

      {/* 메뉴 아이템 목록 */}
      <ul className="menu-items">
        <li>
          <button onClick={onPlaceOpen}>내 장소</button>
        </li>
        <li>
          <button>로그인</button>
        </li>
        <li>
          <button onClick={onSettingsOpen}>설정</button>
        </li>
      </ul>
    </nav>
  );
}
