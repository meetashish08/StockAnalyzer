"""
Generate favicon files for Stock Analytics app.
Creates a professional candlestick chart icon with upward trend.
"""
from PIL import Image, ImageDraw
import os

def create_stock_icon(size):
    """Create a stock chart icon with candlestick and upward trend."""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors matching the app theme
    bg_color = (26, 32, 44, 255)  # Dark background
    green_color = (34, 197, 94, 255)  # Green accent
    chart_color = (156, 163, 175, 255)  # Gray for chart elements

    # Draw circular background
    margin = size // 8
    draw.ellipse([margin, margin, size - margin, size - margin], fill=bg_color)

    # Calculate dimensions for chart elements
    chart_margin = size // 4
    chart_width = size - (2 * chart_margin)
    chart_height = size - (2 * chart_margin)

    # Draw candlestick bars (simplified for small sizes)
    num_bars = 3 if size <= 32 else 4
    bar_width = max(2, chart_width // (num_bars * 3))
    bar_spacing = chart_width // num_bars

    # Candlestick positions (x, top, bottom, is_bullish)
    bars = []
    if size <= 32:
        # Simplified for small sizes
        bars = [
            (chart_margin + bar_spacing * 0.5, chart_margin + chart_height * 0.6, chart_margin + chart_height * 0.9, True),
            (chart_margin + bar_spacing * 1.5, chart_margin + chart_height * 0.4, chart_margin + chart_height * 0.7, True),
            (chart_margin + bar_spacing * 2.5, chart_margin + chart_height * 0.2, chart_margin + chart_height * 0.5, True),
        ]
    else:
        bars = [
            (chart_margin + bar_spacing * 0.5, chart_margin + chart_height * 0.7, chart_margin + chart_height * 0.95, True),
            (chart_margin + bar_spacing * 1.5, chart_margin + chart_height * 0.5, chart_margin + chart_height * 0.8, True),
            (chart_margin + bar_spacing * 2.5, chart_margin + chart_height * 0.3, chart_margin + chart_height * 0.6, True),
            (chart_margin + bar_spacing * 3.5, chart_margin + chart_height * 0.15, chart_margin + chart_height * 0.45, True),
        ]

    # Draw candlesticks
    for x, top, bottom, is_bullish in bars:
        color = green_color if is_bullish else (239, 68, 68, 255)  # red for bearish
        # Draw wick (thin line)
        wick_x = int(x)
        draw.line([(wick_x, int(top)), (wick_x, int(bottom))], fill=color, width=1)
        # Draw body (thicker rectangle)
        body_height = max(2, int((bottom - top) * 0.6))
        body_top = int(top + (bottom - top) * 0.2)
        body_width = int(bar_width)
        draw.rectangle([wick_x - body_width//2, body_top, wick_x + body_width//2, body_top + body_height],
                      fill=color, outline=color)

    # Draw upward trend arrow (small, in corner)
    if size >= 32:
        arrow_size = size // 6
        arrow_x = size - chart_margin - arrow_size
        arrow_y = chart_margin + arrow_size

        # Arrow pointing up-right
        points = [
            (arrow_x, arrow_y),
            (arrow_x + arrow_size, arrow_y - arrow_size),
            (arrow_x + arrow_size, arrow_y),
            (arrow_x + arrow_size - 2, arrow_y),
            (arrow_x + arrow_size - 2, arrow_y - arrow_size + 2),
            (arrow_x + 2, arrow_y),
        ]
        draw.polygon(points, fill=green_color)

    return img

def main():
    # Output directory
    output_dir = os.path.join(os.path.dirname(__file__), 'dist', 'renderer')
    os.makedirs(output_dir, exist_ok=True)

    print("Generating favicon files...")

    # Generate various sizes
    sizes = {
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'favicon-48x48.png': 48,
        'apple-touch-icon.png': 180,
        'android-chrome-192x192.png': 192,
        'android-chrome-512x512.png': 512,
    }

    for filename, size in sizes.items():
        img = create_stock_icon(size)
        filepath = os.path.join(output_dir, filename)
        img.save(filepath, 'PNG')
        print(f"Created {filename} ({size}x{size})")

    # Create favicon.ico with multiple sizes
    ico_sizes = [16, 32, 48]
    ico_images = [create_stock_icon(s) for s in ico_sizes]
    ico_path = os.path.join(output_dir, 'favicon.ico')
    ico_images[0].save(ico_path, format='ICO', sizes=[(s, s) for s in ico_sizes], append_images=ico_images[1:])
    print(f"Created favicon.ico with sizes: {ico_sizes}")

    # Create site.webmanifest
    manifest = {
        "name": "Stock Analytics",
        "short_name": "Stock Analytics",
        "icons": [
            {
                "src": "/android-chrome-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/android-chrome-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ],
        "theme_color": "#1a202c",
        "background_color": "#1a202c",
        "display": "standalone"
    }

    import json
    manifest_path = os.path.join(output_dir, 'site.webmanifest')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print("Created site.webmanifest")

    print("\nFavicon generation complete!")
    print(f"Files created in: {output_dir}")

if __name__ == '__main__':
    main()
