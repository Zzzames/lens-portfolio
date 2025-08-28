# 图片文件夹说明

## 文件夹结构

```
images/
├── profile.jpg           # 首页头像图片
├── nikon-logo.svg        # Nikon品牌标志
├── 500px-logo.svg        # 500px品牌标志
├── categories/           # 作品集分类封面图片
│   ├── street-cover.jpg
│   ├── documentary-cover.jpg
│   ├── nature-cover.jpg
│   ├── cityscape-cover.jpg
│   ├── stilllife-cover.jpg
│   ├── portrait-cover.jpg
│   └── animals-cover.jpg
├── street/              # 街头掠影作品
│   ├── street-01.jpg
│   ├── street-02.jpg
│   └── ...
├── documentary/         # 人文纪实作品
│   ├── doc-01.jpg
│   ├── doc-02.jpg
│   └── ...
├── nature/             # 自然风光作品
│   ├── nature-01.jpg
│   ├── nature-02.jpg
│   └── ...
├── cityscape/          # 城市风光作品
│   ├── city-01.jpg
│   ├── city-02.jpg
│   └── ...
├── stilllife/          # 静物时光作品
│   ├── still-01.jpg
│   ├── still-02.jpg
│   └── ...
├── portrait/           # 人像摄影作品
│   ├── portrait-01.jpg
│   ├── portrait-02.jpg
│   └── ...
└── animals/            # 动物摄影作品
    ├── animals-01.jpg
    ├── animals-02.jpg
    └── ...
```

## 建议的图片规格

- **首页头像**: 150x150px，正方形
- **分类封面**: 400x300px，横向
- **作品图片**: 建议宽度1200px以上，保持原始比例
- **支持格式**: JPG、PNG
- **命名示例**: 
  - `profile.jpg` 或 `profile.png`
  - `street-01.jpg` 或 `street-01.png`
  - `nature-cover.jpg` 或 `nature-cover.png`

## 使用方法

1. 将您的照片按分类放入对应文件夹
2. 命名建议使用数字编号，如 street-01.jpg, street-02.jpg
3. 然后修改对应HTML文件中的图片路径