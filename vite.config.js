import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // 💡 이 'server' 객체를 추가하거나 수정합니다.
    host: true, // 💡 외부 네트워크에서 접속 가능하게 함 (선택 사항이지만 ngrok에 도움됨)
    allowedHosts: [ // 💡 이 'allowedHosts' 배열을 추가합니다.
      'leisha-endogenous-danette.ngrok-free.dev', // 💡 ngrok 주소를 여기에 추가!
      // 만약 ngrok 주소가 바뀌면 이 부분을 새 주소로 업데이트해야 합니다.
      // 또는 ['*'] 를 사용하여 모든 호스트를 허용할 수도 있지만, 보안상 권장되지는 않습니다.
      // 예를 들어, '*.ngrok-free.dev' 와 같이 와일드카드를 사용하면 편리하지만
      // 이것 역시 보안 위험을 약간 증가시킵니다.
    ]
  }
});