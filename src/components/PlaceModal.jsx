// 📁 src/components/PlaceModal.jsx
import { usePlaces } from "../context/PlacesContext";

export default function PlaceModal({ open, onClose }) {
  const { places, deletePlace } = usePlaces();

  if (!open) return null;

  return (
    <div id="placeModal" className="placeModal">
      <div className="modal-content">
        <h2>내 장소 목록</h2>

        <ul id="placeList">
          {places.length === 0 ? (
            <li id="no-places-message">등록된 장소 없음</li>
          ) : (
            places.map(p => (
              <li key={p.id}>
                <span>{p.name}</span>
                <button className="delete-place-btn" onClick={() => deletePlace(p.id)}>
                  삭제
                </button>
              </li>
            ))
          )}
        </ul>

        <button id="closeModal" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
