## 텍스트 요소

text 객체는 간단한 마크업 문법을 지원합니다.

마크업은 <style></style> 태그를 사용하며, 지원되는 속성은 fontSize, fontWeight, fontStyle, color, borderColor, borderWidth 입니다.

예를 들어 다음과 같습니다.

```typescript
const text = world.createText({
  attribute: {
    text: 'Hello, World!\nYou can use multiple line,\nand <style fontSize="20" fontWeight="300" fontStyle="italic" color="yellow" borderColor="red" borderWidth="1">Size, Color, Style, Weight</style> properties also.',
  }
})
```

기본값은 객체의 style 속성을 상속받습니다.
<style></style> 태그 내부에는 또 다른 <style></style> 태그를 사용할 수 있으며, 상속받습니다.

예를 들어 다음과 같습니다.

```typescript
const text = world.createText({
  attribute: {
    text: 'Hello, World!\nYou can use multiple line,\nand <style fontSize="20" fontWeight="300" fontStyle="italic" color="yellow" borderColor="red" borderWidth="1">Size, Color, <style fontSize="10" fontWeight="100">Style, Weight</style></style> properties also.',
  }
})
```

줄바꿈은 `\n`으로 할 수 있습니다.

width를 지정하지 않으면 텍스트의 길이에 맞게 자동으로 조절됩니다.
height를 지정하지 않으면 텍스트의 높이에 맞게 자동으로 조절됩니다.

width를 지정하고 height를 지정하지 않으면, 텍스트의 길이에 맞게 자동으로 조절됩니다.
height를 지정하고 width를 지정하지 않으면, 텍스트의 높이에 맞게 자동으로 조절됩니다.

```typescript
// width, height를 지정하지 않으면 텍스트의 길이에 맞게 자동으로 조절됩니다.
const text = world.createText({
  attribute: {
    text: 'Hello, World!',
  }
})

// width, height를 지정하면 텍스트의 길이에 맞게 자동으로 조절됩니다.
const text2 = world.createText({
  attribute: {
    text: 'Hello, World!',
  },
  style: {
    width: 100,
    height: 100,
  },
})
```

만일 width, height를 지정하고 텍스트의 길이가 이를 벗어날 경우, 텍스트는 잘립니다.

```typescript
const text = world.createText({
  attribute: {
    text: 'Hello, World!',
  },
  style: {
    width: 100,
    height: 100,
  },
})
```

- width가 지정되었을 때, width를 넘어설 경우 텍스트는 줄바꿈처리 됩니다.
- height가 지정되었을 때, height를 넘어설 경우 텍스트는 잘립니다.

이렇게 width가 지정되거나, 텍스트가 여러줄일 경우, textAlign에 따라 정렬이 이루어집니다.

```typescript
const text = world.createText({
  attribute: {
    text: 'Hello, World!\nYou can use multiple line,\nand <style fontSize="20" fontWeight="300" fontStyle="italic" color="yellow" borderColor="red" borderWidth="1">Size, Color, Style, Weight</style> properties also.',
  },
  style: {
    width: 100,
    height: 100,
    textAlign: 'center',
  },
})
```
