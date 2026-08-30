# Sublimation Module

The Sublimation module is a specialized repository for graphic designs used in textile and ceramic printing. It combines a digital asset manager with technical analysis tools.

## 🖼 Design Repository

The system stores design metadata in Supabase and the actual files in a private Storage bucket.

### Storage Strategy
- **Lazy Migration**: The system supports legacy `data:URL` images. When a design with a data-URL is opened, the app automatically uploads it to Supabase Storage to standardize the format.
- **Signed URLs**: To maintain privacy, images are never exposed via public URLs. Instead, the `useImageSrc` hook generates short-lived signed URLs (1 hour validity).

## 🔍 Print Preflight System

One of the most critical features is the **Preflight Analysis**, which prevents printing low-resolution images that would look pixelated.

### How it works:
1. **Image Analysis**: The system loads the image and extracts its natural dimensions in pixels.
2. **Preset Comparison**: The image is compared against standard product sizes (e.g., "Taza 11oz", "Remera A4") defined in `printPreflight.ts`.
3. **DPI Calculation**: It calculates the **Effective DPI** (Dots Per Inch) using the formula:
   $\text{DPI} = \frac{\text{Pixels}}{\text{Centimeters} / 2.54}$
4. **Verdict System**:
   - **OK**: $\ge 285$ DPI (95% of 300).
   - **WARN**: $\ge 150$ DPI.
   - **BAD**: $< 150$ DPI.

This verdict is displayed in the UI and blocks the design from being added to an order unless a "Client Approved" flag is manually set.

## 🎨 Design Studio & AI Tools

The `DesignStudioModal` provides a workspace for design preparation:

### AI Integration
Via the Cloudflare Worker, the module accesses Gemini AI for:
- **Background Removal**: Completely removes backgrounds to create transparent PNGs.
- **Mockup Generation**: Creates photorealistic previews of the design on real products (e.g., a mug or a t-shirt).

### Vectorization
The app includes an implementation of `imagetracerjs` to convert raster images to SVG.
- **Performance**: To prevent the UI from freezing during complex calculations, vectorization runs in a **Web Worker** (`vectorize.worker.ts`).

## 🚀 Key Components
- **`SublimationRepository`**: The main gallery with filtering and search.
- **`SublimationDesignDetailModal`**: The technical view where preflight and AI tools are accessed.
- **`MockupPreviewModal`**: A canvas-based viewer for visualizing the design on a product.
