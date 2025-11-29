// 📁 src/App.jsx
import { useState } from "react";
import Map from "./components/Map";
import Menu from "./components/Menu.jsx";
import SearchModal from "./components/SearchModal";
import PlaceModal from "./components/PlaceModal";
import SettingsModal from "./components/SettingsModal";
import { PlacesProvider } from "./context/PlacesContext";
import "./App.css";

export default function App() {
  const [placeOpen, setPlaceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <PlacesProvider>
      <header>
        <h1>
          언제<span className="h1-gal">갈</span>지도
        </h1>

        <button className="menu-toggle-btn" onClick={() => setPlaceOpen(true)}>
          <img src="/src/assets/icon/menuIcon.svg" alt="menu" />
        </button>

        <button className="search-toggle-btn" onClick={() => setSearchOpen(true)}>
          <img src="/src/assets/icon/searchIcon3.svg" alt="search" />
        </button>
      </header>

      <main>
        <Menu openSettings={() => setSettingsOpen(true)} />
        <Map/>
      </main>

      {/* 모달 */}
      <PlaceModal open={placeOpen} onClose={() => setPlaceOpen(false)}/>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)}/>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}/>
    </PlacesProvider>
  );
}
