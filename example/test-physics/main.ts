import { World } from '../../src/index.js'

const world = new World()
world.createCamera()

world.setGravity({ x: 0, y: -1 })

// 바닥 생성
world.createRectangle({
  attribute: {
    name: 'floor',
    className: 'physics-object',
    physics: 'static',
    friction: 0.5,
  },
  style: {
    width: 600,
    height: 50,
    color: '#444444'
  },
  transform: {
    position: { x: 0, y: -300, z: 0 }
  }
}).on('click', (e) => {
  // 바닥 클릭 시 새로운 박스 생성
  const mx = e.clientX - window.innerWidth / 2;
  const my = window.innerHeight / 2 - e.clientY;
  addBox(mx, my);
});


function addBox(x: number, y: number) {
  const box = world.createRectangle({
    attribute: {
      className: 'physics-object box',
      physics: 'dynamic',
      density: 0.001,
      friction: 0.1,
      restitution: 0.7,
    },
    style: {
      width: 50,
      height: 50,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      opacity: 0.9,
      borderColor: 'red',
      borderWidth: 3,
    },
    transform: {
      position: { x, y, z: 0 }
    }
  });

  box.on('mouseover', () => {
    box.animate({ style: { opacity: 1, borderWidth: 3 } }, 150);
  });

  box.on('mouseout', () => {
    box.animate({ style: { opacity: 0.9, borderWidth: 0 } }, 150);
  });

  box.on('click', (e) => {
    e.stopImmediatePropagation()
    const force = (Math.random() - 0.5) * 50;
    box.applyTorque(force);
  });
}

// 떨어지는 상자들 생성
for (let i = 0; i < 10; i++) {
  addBox((Math.random() - 0.5) * 200, 300 + Math.random() * 200);
}

// 빈 배경 영역 클릭용 더미 오브젝트
world.on('click', (obj, e) => {
  if (obj) return
  const mx = e.clientX - window.innerWidth / 2;
  const my = window.innerHeight / 2 - e.clientY;
  addBox(mx, my);
});

world.start()
