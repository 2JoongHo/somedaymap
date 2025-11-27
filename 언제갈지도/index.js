// 🌍 페이지가 로드되면 실행
window.onload = function () {
  const container = document.getElementById('map');

  // 기본 지도 옵션 (망포역 기준)
  // 지도 초기화 시 defaultCenter를 사용하며, 레벨은 3으로 설정
  const defaultCenter = new kakao.maps.LatLng(37.245833, 127.056667);
  const map = new kakao.maps.Map(container, {
    center: defaultCenter,
    level: 3
  });

  // ✨✨✨ 여기에 현재 위치를 한 번 가져와서 지도 중심 설정하는 로직 추가 ✨✨✨
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const userPosition = new kakao.maps.LatLng(lat, lng);
        map.setCenter(userPosition); // ✨✨ 성공하면 내 위치로 지도의 중심을 재설정 ✨✨
        console.log("지도 중심을 현재 위치로 초기 설정했습니다:", lat, lng);
      },
      function(error) {
        // 위치 가져오기 실패해도 망포역으로 지도가 열리므로 사용자에게는 영향 없음
        console.warn("최초 위치 가져오기 실패. 기본 중심(망포역)을 사용합니다.", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000, // 5초 내에 위치 못 가져오면 실패
        maximumAge: 0
      }
    );
  }

  // 내 현재 위치를 표시할 CustomOverlay 변수 선언 (지도 확대/축소 시 크기 고정)
  let myLocationOverlay = null;

  // 전역에서 관리될 장소 데이터를 담을 배열
  let userPlaces = [];
  // 현재 지도에 표시된 마커들을 관리할 배열
  const currentMarkers = [];
  // `isInitialCenterSet` 플래그는 사용되지 않아 제거했습니다. 지도는 watchPosition에 따라 계속 움직입니다.

  // 현재 지도에 표시된 반경 원 객체
  let currentRadiusCircle = null; 

  // 지도에 열려 있는 인포윈도우 객체
  let currentOpenInfowindow = null; 

  // 🎛️ 주요 DOM 요소들을 미리 가져오기
  const menuToggleButton = document.getElementById('menuToggleButton');
  const mainMenu = document.getElementById('mainMenu');
  // const mainMenu = document.querySelector('nav.main-menu');
  const placeBtn = document.getElementById('placeBtn');
  const loginBtn = document.getElementById('loginBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const placeModal = document.getElementById('placeModal');
  const closeModal = document.getElementById('closeModal');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModal = document.getElementById('closeSettingsModal');
  // '내 위치로 이동' 버튼
  const moveToCurrentLocationBtn = document.getElementById('moveToCurrentLocationBtn');
  const openSearchModalBtn = document.getElementById('openSearchModalBtn');
  const searchModal = document.getElementById('searchModal');
  const closeSearchModal = document.getElementById('closeSearchModal');
  const keywordInput = document.getElementById('keyword');
  const searchBtn = document.getElementById('searchBtn');
  const searchResultsListUl = document.getElementById('searchResultsList');


  /* =========================================================
   *  [1] 헬퍼 함수 정의: 거리 계산, LocalStorage, UI 렌더링, 알림
   * ========================================================= */

  /**
   * 두 위도, 경도 좌표 간의 거리를 미터 단위로 계산합니다 (하버사인 공식).
   * @param {number} lat1 - 첫 번째 지점의 위도
   * @param {number} lon1 - 첫 번째 지점의 경도
   * @param {number} lat2 - 두 번째 지점의 위도
   * @param {number} lon2 - 두 번째 지점의 경도
   * @returns {number} 두 지점 사이의 거리 (미터)
   */
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 지구의 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180; // φ, λ는 위도/경도를 라디안으로 변환
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180; // 위도 차이
    const Δλ = (lon2 - lon1) * Math.PI / 180; // 경도 차이

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위 거리 반환
  }

  /**
   * 고유 ID를 생성합니다.
   * @returns {string} 고유 ID 문자열
   */
  function generateUniqueId() {
    return 'place_' + Date.now() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * localStorage에서 저장된 장소 목록을 불러옵니다.
   * 각 장소의 'isEntered' 상태는 세션 시작 시 초기화됩니다.
   */
  function loadPlacesFromLocalStorage() {
    const storedPlaces = localStorage.getItem('언제갈지도_places');
    if (storedPlaces) {
      userPlaces = JSON.parse(storedPlaces);
      // isEntered 플래그는 매 세션 시작 시 초기화 (새로운 접근으로 간주)
      userPlaces.forEach(place => place.isEntered = false);
      console.log('localStorage에서 불러온 장소:', userPlaces);
    } else {
      userPlaces = [];
    }
  }

  /**
   * 현재 장소 목록(userPlaces)을 localStorage에 저장합니다.
   * 'isEntered' 플래그는 저장하지 않습니다.
   */
  function savePlacesToLocalStorage() {
    // isEntered 플래그는 세션별로 초기화되므로 localStorage에는 저장하지 않음
    const placesToSave = userPlaces.map(({ id, name, lat, lng, radius }) => ({ id, name, lat, lng, radius }));
    localStorage.setItem('언제갈지도_places', JSON.stringify(placesToSave));
    console.log('localStorage에 장소 저장됨:', userPlaces);
  }




    // 📍 설정값 저장을 위한 전역 변수 (기본값 설정)
  let appSettings = {
    defaultRadius: 1000,      // 기본 알림 반경 (미터)
    notifyOnEnter: true,      // 진입 시 알림 여부
    notifyOnExit: true        // 이탈 시 알림 여부
  };

  /**
   * localStorage에서 앱 설정을 불러와 `appSettings` 객체를 업데이트하고 UI에 적용합니다.
   * 없으면 기본값을 사용합니다.
   */
  function loadSettingsFromLocalStorage() {
    const storedSettings = localStorage.getItem('언제갈지도_appSettings');
    if (storedSettings) {
      // JSON 파싱 시 에러 방지를 위해 try-catch 사용 (안전한 파싱)
      try {
        const parsedSettings = JSON.parse(storedSettings);
        // 기본값과 병합하여, 새로운 설정이 추가되어도 오류 없이 불러오도록
        appSettings = { ...appSettings, ...parsedSettings };
        console.log('localStorage에서 설정 불러옴:', appSettings);
      } catch (e) {
        console.error("localStorage에서 설정 불러오기 실패:", e);
        // 파싱 실패 시 기본값으로 재설정 (또는 이전에 로드된 값 유지)
        appSettings = {
            defaultRadius: 1000,
            notifyOnEnter: true,
            notifyOnExit: true
        };
      }
    } else {
      console.log('localStorage에 저장된 설정 없음. 기본값 사용.');
    }
    // 불러온 설정값을 UI에 적용
    updateSettingsUI();
  }

  /**
   * 현재 `appSettings` 객체의 설정값을 `localStorage`에 저장합니다.
   */
  function saveSettingsToLocalStorage() {
    localStorage.setItem('언제갈지도_appSettings', JSON.stringify(appSettings));
    console.log('localStorage에 설정 저장됨:', appSettings);
  }

  /**
   * `appSettings` 객체의 값을 설정 모달 UI 요소에 반영합니다.
   */
  function updateSettingsUI() {
    const defaultRadiusInput = document.getElementById('defaultRadiusInput');
    const notifyOnEnterToggle = document.getElementById('notifyOnEnterToggle');
    const notifyOnExitToggle = document.getElementById('notifyOnExitToggle');

    if (defaultRadiusInput) {
      defaultRadiusInput.value = appSettings.defaultRadius;
    }
    if (notifyOnEnterToggle) {
      notifyOnEnterToggle.checked = appSettings.notifyOnEnter;
    }
    if (notifyOnExitToggle) {
      notifyOnExitToggle.checked = appSettings.notifyOnExit;
    }
  }

  /**
   * 설정 모달 UI의 입력값을 `appSettings` 객체에 반영합니다.
   */
  function updateAppSettingsFromUI() {
    const defaultRadiusInput = document.getElementById('defaultRadiusInput');
    const notifyOnEnterToggle = document.getElementById('notifyOnEnterToggle');
    const notifyOnExitToggle = document.getElementById('notifyOnExitToggle');

    if (defaultRadiusInput) {
      appSettings.defaultRadius = parseInt(defaultRadiusInput.value, 10);
      if (isNaN(appSettings.defaultRadius) || appSettings.defaultRadius <= 0) {
        appSettings.defaultRadius = 1000; // 유효하지 않은 값일 경우 기본값
      }
    }
    if (notifyOnEnterToggle) {
      appSettings.notifyOnEnter = notifyOnEnterToggle.checked;
    }
    if (notifyOnExitToggle) {
      appSettings.notifyOnExit = notifyOnExitToggle.checked;
    }
  }



  
  /**
   * 지도에 표시된 모든 마커를 지우고 배열을 비웁니다.
   */
  function clearMarkers() {
    for (let i = 0; i < currentMarkers.length; i++) {
      currentMarkers[i].setMap(null);
    }
    currentMarkers.length = 0;
  }

  /**
   * userPlaces 배열의 장소들을 지도에 마커로 표시합니다.
   */
  function displayPlacesOnMap() {
    clearMarkers();

    userPlaces.forEach(place => {
      const latlng = new kakao.maps.LatLng(place.lat, place.lng);
      const marker = new kakao.maps.Marker({ position: latlng });
      marker.setMap(map);
      currentMarkers.push(marker);

      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px; white-space: nowrap;">${place.name}</div>`
      });
      // 마커 클릭 시 인포윈도우 표시
      kakao.maps.event.addListener(marker, 'click', () => {
        if (currentOpenInfowindow) {
          currentOpenInfowindow.close();
        }
        infowindow.open(map, marker);
        currentOpenInfowindow = infowindow;
      });
    });
  }

  /**
   * '내 장소 목록' 모달 UI를 userPlaces 데이터로 업데이트합니다.
   * 이벤트 위임을 사용하여 삭제 버튼의 이벤트 리스너를 효율적으로 관리합니다.
   */
  function renderPlaceListInModal() {
    const placeListUl = document.getElementById('placeList');
    placeListUl.innerHTML = ''; // 기존 목록 초기화

    if (userPlaces.length === 0) {
      const noPlaceLi = document.createElement('li');
      noPlaceLi.textContent = '언젠가 가보고 싶은 곳을 찍어보세요!';
      noPlaceLi.id = 'no-places-message'; // CSS 스타일링을 위한 ID
      placeListUl.appendChild(noPlaceLi);
    } else {
      userPlaces.forEach(place => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', place.id); // 장소 ID를 data 속성으로 저장
        listItem.innerHTML = `
          <span>${place.name}</span>
          <button class="delete-place-btn" data-id="${place.id}">삭제</button>
        `;
        placeListUl.appendChild(listItem);
      });
    }

    // ✨✨ 이벤트 위임: #placeList에 한 번만 이벤트 리스너 추가 (플래그 사용) ✨✨
    // 이 리스너는 문서 로드 시 한 번만 추가되면 됨
    if (placeListUl && !placeListUl.dataset.hasClickListener) {
      placeListUl.addEventListener('click', (e) => {
        // 장소 이름 클릭 시 지도 이동
        if (e.target.tagName === 'SPAN') {
          const placeId = e.target.closest('li').dataset.id;
          moveMapToPlace(placeId);
        }
        // 삭제 버튼 클릭 시 장소 삭제
        else if (e.target.classList.contains('delete-place-btn')) {
          e.stopPropagation(); // ✨✨ 추가! 이벤트 버블링 중단! ✨✨
          const placeIdToDelete = e.target.dataset.id;
          deletePlace(placeIdToDelete);
        }
      });
      placeListUl.dataset.hasClickListener = 'true'; // 클릭 리스너가 추가되었음을 표시
    }
  }

  // ✨✨ 새로 추가된 함수: 지도 이동 및 모든 UI 닫기 (이름은 기존 유지)
  function moveMapToPlace(placeId) {
    const foundPlace = userPlaces.find(place => place.id === placeId);
    if (foundPlace) {
      const latlng = new kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
      map.setCenter(latlng); // 지도를 해당 장소의 위치로 이동
      console.log(`'${foundPlace.name}'(으)로 지도를 이동했습니다.`);
      
      closeAllUIElements(); // ✨✨ 지도 이동 시 모든 UI 요소 닫기 ✨✨ (핵심!)

      // 이전 반경 원이 있다면 지도에서 제거
      if (currentRadiusCircle) {
        currentRadiusCircle.setMap(null);
        currentRadiusCircle = null; // null로 설정하여 참조 해제
      }

      // 새 반경 원 생성 및 지도에 표시
      currentRadiusCircle = new kakao.maps.Circle({
        map: map, // 지도 객체
        center: latlng, // 원의 중심 좌표
        radius: foundPlace.radius, // 원의 반지름 (미터 단위)
        strokeWeight: 2, // 선의 두께
        strokeColor: '#007BFF', // 선의 색깔 (파란색 계열)
        strokeOpacity: 0.8, // 선의 불투명도
        strokeStyle: 'solid', // 선의 스타일
        fillColor: '#007BFF', // 채우기 색깔
        fillOpacity: 0.2 // 채우기 불투명도
      });
    } else {
      console.warn(`ID ${placeId}를 가진 장소를 찾을 수 없습니다.`);
    }
  }

  /**
   * 지정된 ID의 장소를 userPlaces에서 삭제하고 localStorage 및 UI를 업데이트합니다.
   * @param {string} idToDelete - 삭제할 장소의 고유 ID
   */
  function deletePlace(idToDelete) {
    userPlaces = userPlaces.filter(place => place.id !== idToDelete);
    savePlacesToLocalStorage();
    displayPlacesOnMap(); // 지도 마커 업데이트
    renderPlaceListInModal(); // 모달 목록 업데이트
  }

  /**
   * 웹 알림 권한을 요청합니다.
   */
  function requestNotificationPermission() {
    // Notification API 지원 여부 확인
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('🔔 알림 권한이 허용되었습니다.');
        } else if (permission === 'denied') {
          console.warn('🔕 알림 권한이 영구적으로 거부되었습니다. 알림을 받을 수 없습니다.');
        } else { // 'default' (사용자가 아직 응답 안 함)
          console.warn('🔕 알림 권한이 아직 허용되지 않았습니다.');
        }
      });
    } else {
      console.warn('⚠️ 이 브라우저는 웹 알림을 지원하지 않습니다.');
    }
  }

  /**
   * 웹 알림 팝업을 띄웁니다.
   * @param {string} title - 알림 제목
   * @param {string} body - 알림 내용
   */
  function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      // 로고 이미지 경로를 알림 아이콘으로 사용
      new Notification(title, { body: body, icon: '../src/assets/icon/logo5.svg' });
    } else if (Notification.permission !== 'denied') {
      // 권한이 없지만 거부된 상태가 아니라면 다시 요청해볼 수 있음
      console.warn('알림 권한이 없어서 알림을 보낼 수 없습니다. 권한을 먼저 요청합니다.');
      // 선택적으로 requestNotificationPermission(); 을 다시 호출할 수 있으나,
      // 페이지 로드 시 한 번만 요청하는 것이 일반적
    }
  }

  // ✨✨✨ 검색 결과 목록을 비우는 헬퍼 함수 추가 ✨✨✨
  function clearSearchResults() {
      if (searchResultsListUl) { // searchResultsListUl은 DOM 요소 참조하는 전역 변수여야 함
          searchResultsListUl.innerHTML = '';
      }
  }

    // 모든 모달과 사이드 메뉴를 닫는 헬퍼 함수 (재활용을 위해 여기에 추가)
  function closeAllUIElements() {
    if (mainMenu && mainMenu.classList.contains('show')) {
      mainMenu.classList.remove('show');
    }
    if (searchModal && searchModal.style.display === 'flex') {
      searchModal.style.display = 'none';
      clearSearchResults(); // 검색 결과 초기화
      if (keywordInput) keywordInput.value = ''; // 검색창 내용도 지움
    }
    if (placeModal && placeModal.style.display === 'flex') {
      placeModal.style.display = 'none';
    }
    if (settingsModal && settingsModal.style.display === 'flex') {
      settingsModal.style.display = 'none';
      updateAppSettingsFromUI(); // 설정 모달 닫을 때 설정 저장 (UI 값 반영 후)
      saveSettingsToLocalStorage(); // 변경된 설정 localStorage에 저장
    }
    // 인포윈도우도 닫기
    if (currentOpenInfowindow) {
      currentOpenInfowindow.close();
      currentOpenInfowindow = null;
    }
    // 반경 원도 제거
    if (currentRadiusCircle) {
      currentRadiusCircle.setMap(null);
      currentRadiusCircle = null;
    }
  }


  /* =========================================================
   *  [2] 주요 기능 로직: 위치 감지, 지오펜싱, 지도 상호작용
   * ========================================================= */

  // Geolocation API를 지원하는 경우
  if (navigator.geolocation) {
    // 페이지 로드 시 알림 권한 요청 (최초 1회)
    requestNotificationPermission();

    // 📍 사용자 현재 위치를 지속적으로 감지하고 업데이트 (Geofencing 용도)
    navigator.geolocation.watchPosition(
      // ✅ 위치 정보 가져오기 성공 시 콜백
      function (position) {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        const userPosition = new kakao.maps.LatLng(currentLat, currentLng);

        // map.setCenter(userPosition); // ✨✨ watchPosition에서 지도 강제 이동 제거! ✨✨
                                      // '내 위치로 이동' 버튼으로 수동 이동.

        console.log(`✅ 현재 위치: ${currentLat}, ${currentLng} (정확도: ${position.coords.accuracy}m)`);

        // 내 위치 CustomOverlay 업데이트 또는 생성
        if (myLocationOverlay) {
          myLocationOverlay.setPosition(userPosition); // 위치만 업데이트
        } else {
          myLocationOverlay = new kakao.maps.CustomOverlay({
            map: map, // 지도에 올리기
            position: userPosition, // 내 위치 좌표
            content: '<div class="my-location-dot"></div>', // CSS 클래스가 적용된 HTML
            zIndex: 100 // 다른 마커보다 높은 Z-index로 항상 위에 보이도록
          });
        }

        // Geofencing 로직: 저장된 모든 장소에 대해 현재 위치와의 거리 확인
        userPlaces.forEach(place => {
          const distance = getDistance(currentLat, currentLng, place.lat, place.lng); // 미터 단위 거리 계산

          if (distance <= place.radius) {
            // 반경 안에 들어옴
            if (!place.isEntered) { // 이전에 반경 밖에 있다가 처음 진입했을 때만
              if (appSettings.notifyOnEnter) { // ✨✨ 진입 알림 설정이 켜져 있을 때만 알림! ✨✨
                const notificationTitle = `🚨 ${place.name}에 도착!`;
                const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m 내에 진입했습니다! 현재 ${distance.toFixed(1)}m`;
                console.log(notificationBody);
                showNotification(notificationTitle, notificationBody); // 웹 알림 띄우기
              }
              place.isEntered = true; // 진입 상태로 변경
            }
          } else {
            // 반경 밖에 있음
            if (place.isEntered) { // 반경 안에 있다가 처음 밖으로 나갔을 때만
              if (appSettings.notifyOnExit) { // ✨✨ 이탈 알림 설정이 켜져 있을 때만 알림! ✨✨
                const notificationTitle = `ℹ️ ${place.name} 이탈`;
                const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m를 벗어났습니다. 현재 ${distance.toFixed(1)}m`;
                console.log(notificationBody);
                showNotification(notificationTitle, notificationBody); // 웹 알림 띄우기
              }
              place.isEntered = false; // 진입 상태 초기화
            }
          }
        });
      },
      // 위치 정보 가져오기 실패 시 콜백
      function (error) {
        console.warn('⚠️ 위치 정보를 지속적으로 가져올 수 없습니다.');
        console.error('위치 정보 오류 코드:', error.code);
        console.error('위치 정보 오류 메시지:', error.message);

        // 오류 발생 시 내 위치 CustomOverlay 제거 (선택 사항)
        if (myLocationOverlay) {
          myLocationOverlay.setMap(null);
          myLocationOverlay = null;
        }

        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.error('사용자가 위치 정보 사용을 거부했습니다. (PERMISSION_DENIED) - 위치 추적이 중단됩니다.');
            break;
          case error.POSITION_UNAVAILABLE:
            console.error('위치 정보를 사용할 수 없습니다. (POSITION_UNAVAILABLE) - GPS/Wi-Fi 신호 문제일 수 있습니다. 위치 추적이 중단됩니다.');
            break;
          case error.TIMEOUT:
            console.error('위치 정보를 가져오는 요청이 시간 초과되었습니다. (TIMEOUT) - 위치 추적이 중단됩니다.');
            break;
          case error.UNKNOWN_ERROR:
            console.error('알 수 없는 위치 정보 오류가 발생했습니다. (UNKNOWN_ERROR) - 알림 없이 지오펜싱 기능을 사용할 수 없습니다.');
            break;
        }
      },
      // watchPosition 옵션 설정: 고정밀, 타임아웃, 캐시 사용 안 함
      {
        enableHighAccuracy: true, // 고정밀 위치 요청 (배터리 소모 증가 가능)
        timeout: 15000,           // 15초 내에 위치 정보 못 가져오면 실패
        maximumAge: 0             // 캐시된 위치 사용 안 함 (항상 최신 위치 요청)
      }
    );
  } else {
    // Geolocation API를 지원하지 않는 브라우저인 경우
    console.warn('⚠️ 이 브라우저는 Geolocation을 지원하지 않습니다.');
    alert('이 브라우저는 위치 정보를 지원하지 않아 지오펜싱 기능을 사용할 수 없습니다.');
  }

  // 페이지 로드 시 저장된 장소 불러와 지도에 표시
  loadPlacesFromLocalStorage();
  displayPlacesOnMap();
  loadSettingsFromLocalStorage(); // ✨✨ 페이지 로드 시 앱 설정 불러오기! ✨✨


  /* =========================================================
   *  [3] 이벤트 리스너: UI 상호작용
   * ========================================================= */

  // 모든 모달과 사이드 메뉴를 닫는 헬퍼 함수 (이미 위에 추가하도록 했으니 건드리지마!)
  // function closeAllUIElements() { ... }

  // 📍 메뉴 토글 버튼 이벤트 리스너
  if (menuToggleButton && mainMenu) {
    menuToggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      mainMenu.classList.toggle('show'); // 메뉴만 토글
    });
  }

  // 문서 어디든 클릭 시 모든 UI 요소 닫기
  document.addEventListener('click', (e) => {
    // 클릭된 요소가 메뉴, 메뉴 토글 버튼, 열려 있는 모달 등이 아닌 바깥 영역을 클릭했을 때만 닫기
    const isClickInsideMainMenu = mainMenu && mainMenu.contains(e.target);
    const isClickOnMenuButton = e.target === menuToggleButton || menuToggleButton.contains(e.target);
    const isClickInsideSearchModal = searchModal && searchModal.contains(e.target);
    const isClickOnSearchButton = e.target === openSearchModalBtn || openSearchModalBtn.contains(e.target);
    const isClickInsidePlaceModal = placeModal && placeModal.contains(e.target);
    const isClickOnPlaceButton = e.target === placeBtn || placeBtn.contains(e.target); // placeBtn은 ul#mainMenu 안에 있지만 직접 클릭하는 경우를 위해
    const isClickInsideSettingsModal = settingsModal && settingsModal.contains(e.target);
    const isClickOnSettingsButton = e.target === settingsBtn || settingsBtn.contains(e.target); // settingsBtn은 ul#mainMenu 안에 있지만 직접 클릭하는 경우를 위해


    if (!isClickInsideMainMenu && !isClickOnMenuButton &&
        !isClickInsideSearchModal && !isClickOnSearchButton &&
        !isClickInsidePlaceModal && !isClickOnPlaceButton &&
        !isClickInsideSettingsModal && !isClickOnSettingsButton) {
      closeAllUIElements();
    }
    // 지도 빈 공간 클릭 시 인포윈도우만 닫기 (mainMenu 등 닫는 건 위에 closeAllUIElements()로 처리됨)
    // if (currentOpenInfowindow && !e.target.closest('.kakao_maps_sdk')) { // 카카오 맵 영역이 아닌 곳 클릭 시
    //    currentOpenInfowindow.close();
    //    currentOpenInfowindow = null;
    // }
    // 아니면 그냥 closeAllUIElements()에 포함시켜서 모든 외부 클릭에 대해 모두 닫아버려도 좋음
    if (e.target.tagName !== 'SPAN' && e.target.tagName !== 'BUTTON' && !e.target.closest('.kakao_maps_sdk') && !e.target.closest('.modal-content') && !e.target.closest('.main-menu')) {
      closeAllUIElements();
    }

  });


  // 📍 메뉴 아이템 클릭 이벤트 (내 장소, 로그인, 설정)
  if (placeBtn) {
    placeBtn.addEventListener('click', () => {
      console.log('placeBtn 클릭됨! 모달을 엽니다.');
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      if (placeModal) {
        placeModal.style.display = 'flex'; // 모달 열기
        renderPlaceListInModal(); // 모달 내용 업데이트
      } else {
        console.error('placeModal 요소를 찾을 수 없습니다.');
      }
    });
  }
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      alert("로그인 기능은 곧 추가됩니다.");
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      if (settingsModal) {
        loadSettingsFromLocalStorage(); // 모달 열기 전에 최신 설정 불러와 UI에 적용
        settingsModal.style.display = 'flex'; // 설정 모달 열기
      } else {
        console.error('settingsModal 요소를 찾을 수 없습니다.');
      }
    });
  }

    /**
   * 검색 결과를 검색 모달 내부에 표시하는 함수입니다.
   * @param {Array} results - 검색 결과 장소 배열
   * @param {string} [keyword=''] - 검색어 (메시지 표시용)
   */
  function showSearchResults(results, keyword = '') {
    if (!searchResultsListUl) {
        console.error("searchResultsListUl 요소를 찾을 수 없습니다.");
        return;
    }
    searchResultsListUl.innerHTML = ''; // 기존 내용 초기화

    if (results.length === 0) {
      const messageLi = document.createElement('li');
      messageLi.id = 'no-search-results'; // CSS 스타일링을 위한 ID
      messageLi.textContent = keyword ? `'${keyword}'에 대한 검색 결과가 없습니다.` : '검색어를 입력해주세요.';
      searchResultsListUl.appendChild(messageLi);
      return;
    }

    results.forEach(place => {
      const listItem = document.createElement('li');
      listItem.setAttribute('data-id', place.id);
      listItem.innerHTML = `
        <span>${place.name}</span>
        <button class="delete-place-btn" data-id="${place.id}">삭제</button>
      `;
      searchResultsListUl.appendChild(listItem);
    });

    // ✨✨ 이벤트 위임: 검색 결과 목록에도 이벤트 위임 적용 (삭제 및 지도 이동) ✨✨
    // 이 리스너는 문서 로드 시 한 번만 추가되면 됨을 보장
    if (!searchResultsListUl.dataset.hasClickListener) {
      searchResultsListUl.addEventListener('click', (e) => {
        // 장소 이름 클릭 시 지도 이동
        if (e.target.tagName === 'SPAN') {
          const placeId = e.target.closest('li').dataset.id;
          moveMapToPlace(placeId);
          // 검색 모달 닫기 (사용자가 장소를 선택했으니)
          if (searchModal) {
              searchModal.style.display = 'none';
              clearSearchResults(); // 검색 결과 비우기
              if (keywordInput) keywordInput.value = '';
          }
        }
        // 삭제 버튼 클릭 시 장소 삭제
        else if (e.target.classList.contains('delete-place-btn')) {
          e.stopPropagation(); // ✨✨ 이벤트 버블링 중단! ✨✨
          const placeIdToDelete = e.target.dataset.id;
          deletePlace(placeIdToDelete);
          // 삭제 후 검색 결과 업데이트 (다시 검색 버튼 누르지 않고도 즉시 결과에서 지워지도록 필터링)
          const currentKeyword = keywordInput ? keywordInput.value.trim() : ''; // 현재 검색어 가져오기
          const updatedResults = userPlaces.filter(p => p.name.includes(currentKeyword) || p.name.toLowerCase().includes(currentKeyword.toLowerCase()));
          showSearchResults(updatedResults, currentKeyword); // 갱신된 결과로 다시 렌더링
        }
      });
      searchResultsListUl.dataset.hasClickListener = 'true';
    }
  }

  // ✨✨ 새로 추가: 지도 위에 별도로 띄울 검색 버튼 클릭 이벤트 ✨✨
  if (openSearchModalBtn) {
    openSearchModalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      if (searchModal) {
        searchModal.style.display = 'flex';
        if (keywordInput) keywordInput.focus();
        clearSearchResults(); // 검색 모달 열릴 때 혹시 모를 이전 검색 결과 비우기
        if (keywordInput) keywordInput.value = ''; // 검색창 내용도 지움
      } else {
        console.error('searchModal 요소를 찾을 수 없습니다.');
      }
    });
  }

  // ✨✨ 검색 버튼 클릭 시 (검색 기능 핵심 로직) ✨✨
  if (searchBtn && keywordInput) {
    searchBtn.addEventListener('click', () => {
      const keyword = keywordInput.value.trim();
      if (!keyword) {
        showSearchResults([], ''); // 빈 배열과 빈 키워드를 넘겨 "검색어를 입력하세요" 메시지 표시
        return;
      }

      const results = userPlaces.filter(place =>
        place.name.includes(keyword) || place.name.toLowerCase().includes(keyword.toLowerCase())
      );

      showSearchResults(results, keyword); // 검색 결과를 보여주는 함수 호출
    });
  }
  // ✨✨ 새로 추가: Enter 키로 검색하기 ✨✨
  if (keywordInput) {
    keywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchBtn.click(); // 검색 버튼 클릭 이벤트 발생
      }
    });
  }

  // ✨✨ 검색 모달 닫기 버튼 및 외부 영역 클릭 이벤트 ✨✨
  if (closeSearchModal) {
    closeSearchModal.addEventListener('click', () => {
      console.log('closeSearchModal 클릭됨! 모달을 닫습니다.');
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
    });
  }
  if (searchModal) {
    searchModal.addEventListener('click', e => {
      if (e.target === searchModal) { // 모달의 바깥 영역을 클릭했는지 확인
        console.log('검색 모달 바깥 영역 클릭됨! 모달을 닫습니다.');
        closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      }
    });
  }

  // ✨ 모달 닫기 버튼 및 외부 영역 클릭 이벤트 (내 장소 모달)
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      console.log('closeModal 클릭됨! 내 장소 모달을 닫습니다.');
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
    });
  }
  if (placeModal) {
    placeModal.addEventListener('click', e => {
      if (e.target === placeModal) { // 모달의 바깥 영역을 클릭했는지 확인
        console.log('내 장소 모달 바깥 영역 클릭됨! 모달을 닫습니다.');
        closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      }
    });
  }

  // ✨✨ 설정 모달 닫기 버튼 및 외부 영역 클릭 이벤트 ✨✨
  if (closeSettingsModal) {
    closeSettingsModal.addEventListener('click', () => {
      console.log('closeSettingsModal 클릭됨! 설정 모달을 닫습니다.');
      closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) {
        console.log('설정 모달 바깥 영역 클릭됨! 모달을 닫습니다.');
        closeAllUIElements(); // ✨✨ 다른 모든 UI 요소 닫기 ✨✨
      }
    });
  }

  // '내 위치로 이동' 버튼 클릭 이벤트
  if (moveToCurrentLocationBtn) {
    moveToCurrentLocationBtn.addEventListener('click', () => {
      console.log('내 위치로 이동 버튼 클릭됨!');
      if (navigator.geolocation) {
        // watchPosition과 달리 getCurrentPosition은 1회성으로 현재 위치를 요청
        navigator.geolocation.getCurrentPosition(
          function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const userPosition = new kakao.maps.LatLng(lat, lng);
            map.setCenter(userPosition); // 지도를 현재 위치로 이동
            console.log('지도 현재 위치로 이동 완료:', lat, lng);
            // 내 위치 표시 오버레이 업데이트
            if (myLocationOverlay) {
              myLocationOverlay.setPosition(userPosition);
            } else {
              myLocationOverlay = new kakao.maps.CustomOverlay({
                map: map,
                position: userPosition,
                content: '<div class="my-location-dot"></div>',
                zIndex: 100
              });
            }
          },
          function (error) {
            // 위치 정보를 가져오지 못했을 때 사용자에게 상세 안내
            let errorMessage = "내 위치를 가져올 수 없습니다. 브라우저/기기 위치 설정 및 권한을 확인해주세요.";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "사용자가 위치 정보 접근을 허용하지 않았습니다.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "위치 정보를 사용할 수 없습니다. (GPS 신호 불량, Wi-Fi 불안정 등)";
                break;
              case error.TIMEOUT:
                errorMessage = "위치 정보를 가져오는 요청이 시간 초과되었습니다.";
                break;
            }
            alert(errorMessage);
            console.error('내 위치로 이동 실패:', error);
          },
          // getCurrentPosition 옵션 설정
          {
            enableHighAccuracy: true,
            timeout: 15000, // 15초 내에 위치 정보 가져오지 못하면 실패
            maximumAge: 0
          }
        );
      } else {
        alert("이 브라우저는 Geolocation을 지원하지 않습니다.");
        console.warn('⚠️ 이 브라우저는 Geolocation을 지원하지 않습니다.');
      }
    });
  }

    // 새로 추가된 함수: 지도 이동 및 모달 닫기
  function moveMapToPlace(placeId) {
    const foundPlace = userPlaces.find(place => place.id === placeId);
    if (foundPlace) {
      const latlng = new kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
      map.setCenter(latlng); // 지도를 해당 장소의 위치로 이동
      console.log(`'${foundPlace.name}'(으)로 지도를 이동했습니다.`);
      
      // 이전 반경 원이 있다면 지도에서 제거
      if (currentRadiusCircle) {
        currentRadiusCircle.setMap(null);
        currentRadiusCircle = null; // null로 설정하여 참조 해제
      }

      // 새 반경 원 생성 및 지도에 표시
      currentRadiusCircle = new kakao.maps.Circle({
        map: map, // 지도 객체
        center: latlng, // 원의 중심 좌표
        radius: foundPlace.radius, // 원의 반지름 (미터 단위)
        strokeWeight: 2, // 선의 두께
        strokeColor: '#007BFF', // 선의 색깔 (파란색 계열)
        strokeOpacity: 0.8, // 선의 불투명도
        strokeStyle: 'solid', // 선의 스타일
        fillColor: '#007BFF', // 채우기 색깔
        fillOpacity: 0.2 // 채우기 불투명도
      });

      // 모달이 열려 있다면 닫기
      if (placeModal && placeModal.style.display === 'flex') {
        placeModal.style.display = 'none';
      }
    } else {
      console.warn(`ID ${placeId}를 가진 장소를 찾을 수 없습니다.`);
    }
  }


  /* =========================================================
   *  [4] 카카오 맵 서비스 및 추가 이벤트 리스너 (기존과 동일)
   * ========================================================= */

  // 지오코더 객체 생성 (좌표 → 주소 변환)
  const geocoder = new kakao.maps.services.Geocoder();
  // 장소 검색 객체 생성
  const ps = new kakao.maps.services.Places();

  // 좌클릭 시: 클릭한 위치의 위도/경도를 콘솔에 출력 (디버깅 용도)
  kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
    const latlng = mouseEvent.latLng;
    console.log(`좌클릭 → 위도: ${latlng.getLat()}, 경도: ${latlng.getLng()}`);

    // 지도 빈 공간 클릭 시 모든 UI 요소 닫기
    closeAllUIElements(); // ✨✨ 모든 UI 요소를 닫음 ✨✨
  });

  // 우클릭 시: 지도에 표시된 장소 정보 가져와 마커 표시 및 localStorage에 저장
  kakao.maps.event.addListener(map, 'rightclick', function (mouseEvent) {
    const latlng = mouseEvent.latLng; // 우클릭한 위도, 경도
    let defaultName = "새로운 장소"; // 기본 장소 이름 초기화

    // 1. POI(관심 지점) 검색 (가장 가까운 상호명)
    ps.keywordSearch('', (data, status) => {
      console.log('keywordSearch 결과:', data, status);

      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        defaultName = data[0].place_name; // 가장 가까운 POI 이름 사용
        console.log('가장 가까운 POI 이름:', defaultName);

        // 상호명이 '빌딩', '도로' 등 일반적인 경우, 주소 검색을 시도 (UX 개선)
        const genericKeywords = ['빌딩', '도로', '아파트', '주택', '건물', '입구', '정류장', '교차로', '지점', '타워'];
        if (genericKeywords.some(keyword => defaultName.includes(keyword)) || data[0].category_group_code === '') {
          console.log('검색된 POI 이름이 일반적이거나 카테고리가 없어, 주소 검색을 시도합니다.');
          defaultName = "새로운 장소"; // 주소로 찾기 위해 초기화
        }
      } else {
        console.log('keywordSearch로 상호명 검색 실패. 주소 검색을 시도합니다.');
      }

      // 2. POI 검색에 실패했거나 일반적인 POI 이름인 경우, 좌표를 주소로 변환하여 사용
      if (defaultName === "새로운 장소") {
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function (result, status) {
          if (status === kakao.maps.services.Status.OK) {
            // 도로명 주소 또는 지번 주소 중 하나를 기본 이름으로 사용
            defaultName =
              result[0].road_address?.address_name ||
              result[0].address?.address_name ||
              "새로운 장소";
            console.log('geocoder로 찾은 주소:', defaultName);
          } else {
            console.log('geocoder로도 주소 검색 실패.');
          }
          promptAndAddMarkerAndSave(latlng, defaultName); // 사용자에게 이름/반경 입력 요청
        });
      } else {
        promptAndAddMarkerAndSave(latlng, defaultName); // 사용자에게 이름/반경 입력 요청
      }
    }, {
      location: latlng, // 우클릭한 위치 기준으로 검색
      radius: 50,      // 반경 50미터 이내에서 검색
      size: 1          // 최대 1개의 결과만 가져옴
    });
  });

  /**
   * 사용자에게 장소 이름과 알림 반경을 입력받아, 새 장소를 userPlaces에 추가하고 localStorage 및 UI를 업데이트합니다.
   * @param {kakao.maps.LatLng} latlng - 장소의 위도, 경도 객체
   * @param {string} initialName - 장소 이름의 초기값
   */
  function promptAndAddMarkerAndSave(latlng, initialName) {
    const placeName = prompt("이 장소의 이름을 입력하세요:", initialName);
    if (!placeName || placeName.trim() === "") return; // 이름 입력 없으면 취소

    // ✨✨ 알림 반경 입력받을 때, appSettings.defaultRadius 값을 기본값으로 사용! ✨✨
    let radius = parseInt(
      prompt(
        `알림 반경을 미터 단위로 입력하세요 (기본값: ${appSettings.defaultRadius}m):`, 
        appSettings.defaultRadius.toString() // prompt의 기본값은 문자열이어야 함
      )
    );
    // 유효하지 않은 입력(숫자가 아니거나 0 이하)일 경우 기본값 appSettings.defaultRadius로 설정
    if (isNaN(radius) || radius <= 0) {
      radius = appSettings.defaultRadius; // ✨✨ 여기도 설정값 활용! ✨✨
    }

    const newPlace = {
      id: generateUniqueId(), // 고유 ID 생성
      name: placeName,
      lat: latlng.getLat(),
      lng: latlng.getLng(),
      radius: radius, // 알림 반경 저장
      isEntered: false // 지오펜싱 진입 상태 초기화
    };

    userPlaces.push(newPlace); // 새 장소를 배열에 추가
    savePlacesToLocalStorage(); // localStorage 업데이트
    displayPlacesOnMap(); // 지도 마커 업데이트

    console.log(`새 장소 등록 및 저장 완료: ${placeName}, 반경: ${radius}m`);
  }
};