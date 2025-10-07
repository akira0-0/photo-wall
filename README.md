# photo-wall
照片墙网站：ddppjourney.com

这是一个基于现代 Serverless 架构构建的全栈照片墙网站。它允许用户上传照片，按两级分类（例如：年份 -> 活动）进行组织和浏览。

本项目采用了一系列提供免费额度的云服务，是学习和实践现代 Web 开发的绝佳范例。

## 技术栈核心

- **前端框架**: [Next.js](https://nextjs.org/) (React 框架，支持服务端渲染和静态生成)
- **数据库**: [Supabase](https://supabase.io/) (提供 PostgreSQL 数据库、认证和即时 API)
- **文件存储**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) (兼容 S3 API 的对象存储服务)
- **部署**: [Vercel](https://vercel.com/) (为 Next.js 提供无缝的持续集成和部署)
- **监控**: [Sentry](https://sentry.io/) (错误捕获与性能监控)

## 功能特性

- **照片上传**: 用户可以从本地选择图片文件进行上传。
- **两级分类**: 照片可以归类到二级分类下（例如：`2023年 -> 春季出游`）。
- **分类浏览**: 用户可以通过两级导航筛选和查看不同分类下的照片。
- **瀑布流布局**: 照片墙以美观的网格或瀑布流形式展示。
- **Serverless 架构**: 无需管理传统后端服务器，具有高可用性和弹性伸缩能力。

## 数据库设计

我们在 Supabase 中使用两张核心数据表。

### `categories` (分类表)

采用自关联设计，通过 `parent_id` 字段实现层级关系。

| 字段名      | 类型      | 描述                                       |
| ----------- | --------- | ------------------------------------------ |
| `id`        | `BIGINT`  | 主键, 自增                                 |
| `name`      | `TEXT`    | 分类名称 (例如 "2023年" 或 "春季出游")     |
| `parent_id` | `BIGINT`  | 指向 `categories.id`，顶级分类此字段为 NULL |
| `created_at`| `TIMESTAMPTZ` | 创建时间                                   |

### `photos` (照片表)

存储每张照片的元数据，并通过 `category_id` 关联到具体的子分类。

| 字段名      | 类型      | 描述                                       |
| ----------- | --------- | ------------------------------------------ |
| `id`        | `BIGINT`  | 主键, 自增                                 |
| `category_id`| `BIGINT`  | 外键，关联到 `categories.id` (应为二级分类) |
| `image_url` | `TEXT`    | 照片在 Cloudflare R2 上的公开访问 URL      |
| `created_at`| `TIMESTAMPTZ` | 创建时间                                   |

## 开发步骤

### 1. 基础设施搭建

1.  **域名与 DNS 配置**:
    - **托管域名到 Cloudflare**: 登录 Cloudflare，添加你的域名。然后，到你的域名注册商（如 Spaceship, GoDaddy）处，将域名的名称服务器 (Nameservers) 修改为 Cloudflare 提供的值。
    - **注册其他服务账户**:
        - 创建 [GitHub](https://github.com/) 仓库。
        - 注册 [Supabase](https://supabase.io/) 并创建一个新项目。
        - 注册 [Vercel](https://vercel.com/) 并关联你的 GitHub 账户。

2.  **配置 Supabase**:
    - 在 Supabase Dashboard 的 SQL Editor 中执行上述 SQL 创建 `categories` 和 `photos` 表。
    - （推荐）为表开启行级别安全 (RLS)，并设置相应的读写策略。

3.  **配置 Cloudflare R2 (使用自定义域名)**:
    - **创建 R2 存储桶**: 在 Cloudflare 中创建一个 R2 存储桶 (e.g., `photowall-media`)。
    - **绑定子域名到 R2**: 在 R2 存储桶的设置中，连接一个自定义域名，例如 `media.yourdomain.com`。Cloudflare 会自动为你处理 DNS 和 SSL。
    - **获取 API 密钥**: 创建一个 R2 API 令牌，记下 `Access Key ID` 和 `Secret Access Key`。

### 2. 本地开发

1.  **克隆项目并安装依赖**:
    ```bash
    git clone <your-repo-url>
    cd <project-name>
    npm install
    ```

2.  **配置环境变量**:
    - 在项目根目录创建 `.env.local` 文件。
    - 填入从 Supabase 和 Cloudflare 获取的密钥和 URL。注意 `NEXT_PUBLIC_R2_PUBLIC_URL` 应为你的 R2 自定义子域名。
    ```env
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

    # Cloudflare R2
    CLOUDFLARE_ACCOUNT_ID=<your-cloudflare-account-id>
    R2_ACCESS_KEY_ID=<your-r2-access-key-id>
    R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
    R2_BUCKET_NAME=<your-r2-bucket-name>
    NEXT_PUBLIC_R2_PUBLIC_URL=https://media.yourdomain.com
    ```

3.  **运行开发服务器**:
    ```bash
    npm run dev
    ```
    在 `http://localhost:3000` 查看你的应用。

### 3. 核心逻辑实现

- **客户端直传 R2**:
    1.  前端选择文件后，调用 Next.js 的一个 API Route (`/api/upload-url`)。
    2.  该 API Route 使用 Cloudflare 密钥生成一个有时效性的预签名 URL (Presigned URL)。
    3.  前端使用此 URL，通过 `PUT` 请求直接将文件上传到 R2，不经过服务器中转。
    4.  上传成功后，前端将照片的元数据（包括 R2 URL 和分类 ID）写入 Supabase 数据库。

- **层级分类处理**:
    1.  在页面加载时，从 Supabase 获取所有分类。
    2.  在前端将扁平的分类列表重组成树状结构，用于渲染两级导航菜单。
    3.  上传表单中的分类选择器应设计为级联下拉框，以确保用户选择的是二级分类。

### 4. 部署

1.  **推送代码**: 将本地代码推送到 GitHub 仓库。
2.  **导入 Vercel**: 在 Vercel Dashboard 中，从 GitHub 导入你的项目。
3.  **添加自定义域名**:
    - 在 Vercel 项目的 "Settings" -> "Domains" 中，添加你的主域名 (e.g., `yourdomain.com` 或 `www.yourdomain.com`)。
    - 按照 Vercel 的指引，回到 Cloudflare 的 DNS 设置页面，添加所需的 `CNAME` 或 `A` 记录。
4.  **配置环境变量**: 将 `.env.local` 文件中的所有环境变量添加到 Vercel 项目的设置中。
5.  **部署**: Vercel 会自动构建和部署你的应用。每次推送到主分支时，都会触发自动更新。
