import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";


function App() {
  // Инициализируем слежение
  const { ref, lookAt } = useGaze({ travel: 4 });

  // Заставляем глаза следить за курсором
  lookAt("pointer");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-2xl font-bold text-gray-800">Blobus AI Tutor</h1>

      <div className="w-48 h-48">
        <Blobatar
          ref={ref}
          name="grandcef12415362434"
          traits={{
            shape: 0.35,
            "body.r": 0.456,
            "body.ratio": 0,
            "body.n": 0.999,
            "eye.rx": 0.969,
            "eye.ratio": 0.164,
            "eye.n": 0.232,
            "eye.gap": 0.306,
            "eye.lean": 0.437,
            "gaze.x": 0.725,
            "gaze.y": 0.378,
            tone: [0.1, 0.28],
            hue: 0.808,
          }}
          animate="always" // Обязательно для работы gaze
        />
      </div>

      <p className="text-gray-500 text-sm">Подвигай мышкой, чтобы проверить</p>
    </div>
  );
}

export default App;