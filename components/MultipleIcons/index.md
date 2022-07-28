## MultipleIcons

传入多个图标，可根据宽度自适应调整显示图标数量，或指定显示图标数量。

### 使用

```tsx
import React from "react";
import {
  HomeOutlined,
  SettingFilled,
  SmileOutlined,
  SmileTwoTone,
  HeartTwoTone,
  CheckCircleTwoTone,
} from "@ant-design/icons";

const App: React.FC = () => (
  <MultipleIcons>
    <HomeOutlined />
    <SettingFilled />
    <SmileOutlined />
    <SmileTwoTone />
    <HeartTwoTone twoToneColor="#eb2f96" />
    <CheckCircleTwoTone twoToneColor="#52c41a" />
  </MultipleIcons>
);

export default App;
```
