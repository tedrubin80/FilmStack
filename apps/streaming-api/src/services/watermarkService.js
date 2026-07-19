const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execFileAsync = util.promisify(execFile);

/**
 * Video Watermarking Service using FFmpeg
 * Adds text or image watermarks to videos for copyright protection
 * Uses execFile instead of exec to prevent command injection
 */

class WatermarkService {
    constructor() {
        this.processingDir = process.env.PROCESSING_DRIVE || '/tmp';
        this.watermarkEnabled = process.env.ENABLE_WATERMARK !== 'false';
        this.defaultPosition = process.env.WATERMARK_POSITION || 'bottom-right';
        this.defaultOpacity = parseFloat(process.env.WATERMARK_OPACITY || '0.7');
        this.watermarkLogoPath = process.env.WATERMARK_LOGO_PATH || null;
    }

    /**
     * Validate file path to prevent path traversal
     */
    _validatePath(filePath) {
        const resolved = path.resolve(filePath);
        if (resolved.includes('..') || resolved.includes('\0')) {
            throw new Error('Invalid file path');
        }
        return resolved;
    }

    /**
     * Sanitize text for FFmpeg drawtext filter
     */
    _sanitizeText(text) {
        // Remove characters that could break FFmpeg filter syntax or enable injection
        return String(text).replace(/[;|&$`\\'"!\n\r]/g, '').substring(0, 200);
    }

    /**
     * Validate numeric input
     */
    _validateNumber(value, min, max, defaultValue) {
        const num = Number(value);
        if (isNaN(num) || num < min || num > max) return defaultValue;
        return num;
    }

    /**
     * Validate color value for FFmpeg
     */
    _validateColor(color) {
        const allowed = ['white', 'black', 'red', 'green', 'blue', 'yellow', 'gray'];
        if (allowed.includes(color)) return color;
        // Allow hex colors
        if (/^0x[0-9a-fA-F]{6}$/.test(color)) return color;
        return 'white';
    }

    /**
     * Add text watermark to video
     */
    async addTextWatermark(inputPath, outputPath, options = {}) {
        try {
            const {
                text = 'ReelShorts.live',
                fontSize = 24,
                fontColor = 'white',
                position = this.defaultPosition,
                opacity = this.defaultOpacity,
                fontFile = null
            } = options;

            const safeInputPath = this._validatePath(inputPath);
            const safeOutputPath = this._validatePath(outputPath);
            const safeText = this._sanitizeText(text);
            const safeFontSize = this._validateNumber(fontSize, 8, 200, 24);
            const safeFontColor = this._validateColor(fontColor);
            const safeOpacity = this._validateNumber(opacity, 0, 1, 0.7);

            if (!fs.existsSync(safeInputPath)) {
                throw new Error(`Input file not found: ${safeInputPath}`);
            }

            const positionFilter = this.getPositionFilter(position, safeFontSize);
            const fontPath = fontFile || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

            const filterComplex = `drawtext=text='${safeText}':` +
                `fontfile=${fontPath}:` +
                `fontsize=${safeFontSize}:` +
                `fontcolor=${safeFontColor}@${safeOpacity}:` +
                `${positionFilter}:` +
                `shadowcolor=black@0.5:shadowx=2:shadowy=2`;

            console.log(`Adding text watermark: "${safeText}"`);

            const args = [
                '-i', safeInputPath,
                '-vf', filterComplex,
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                '-c:a', 'copy',
                safeOutputPath, '-y'
            ];

            await execFileAsync('ffmpeg', args);

            console.log(`Text watermark added successfully`);
            return safeOutputPath;

        } catch (error) {
            console.error('Error adding text watermark:', error);
            throw error;
        }
    }

    /**
     * Add image/logo watermark to video
     */
    async addLogoWatermark(inputPath, outputPath, logoPath, options = {}) {
        try {
            const {
                position = this.defaultPosition,
                opacity = this.defaultOpacity,
                scale = 0.15
            } = options;

            const safeInputPath = this._validatePath(inputPath);
            const safeOutputPath = this._validatePath(outputPath);
            const safeLogoPath = this._validatePath(logoPath);
            const safeOpacity = this._validateNumber(opacity, 0, 1, 0.7);
            const safeScale = this._validateNumber(scale, 0.01, 1, 0.15);

            if (!fs.existsSync(safeInputPath)) {
                throw new Error(`Input file not found: ${safeInputPath}`);
            }

            if (!fs.existsSync(safeLogoPath)) {
                throw new Error(`Logo file not found: ${safeLogoPath}`);
            }

            const dimensions = await this.getVideoDimensions(safeInputPath);
            const logoWidth = Math.floor(dimensions.width * safeScale);

            const positionFilter = this.getLogoPositionFilter(position, 20);

            console.log(`Adding logo watermark from: ${path.basename(safeLogoPath)}`);

            const filterComplex =
                `[1:v]scale=${logoWidth}:-1,format=rgba,colorchannelmixer=aa=${safeOpacity}[logo];` +
                `[0:v][logo]overlay=${positionFilter}`;

            const args = [
                '-i', safeInputPath, '-i', safeLogoPath,
                '-filter_complex', filterComplex,
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                '-c:a', 'copy',
                safeOutputPath, '-y'
            ];

            await execFileAsync('ffmpeg', args);

            console.log(`Logo watermark added successfully`);
            return safeOutputPath;

        } catch (error) {
            console.error('Error adding logo watermark:', error);
            throw error;
        }
    }

    /**
     * Add combined text and logo watermark
     */
    async addCombinedWatermark(inputPath, outputPath, options = {}) {
        try {
            const {
                text = 'ReelShorts.live',
                logoPath = this.watermarkLogoPath,
                channelName = null
            } = options;

            let tempPath = inputPath;

            if (logoPath && fs.existsSync(logoPath)) {
                tempPath = path.join(
                    this.processingDir,
                    `temp_logo_${Date.now()}_${path.basename(inputPath)}`
                );
                await this.addLogoWatermark(inputPath, tempPath, logoPath, {
                    position: 'top-right',
                    opacity: 0.8,
                    scale: 0.12
                });
            }

            const watermarkText = channelName
                ? `${this._sanitizeText(channelName)} - ${this._sanitizeText(text)}`
                : this._sanitizeText(text);

            await this.addTextWatermark(tempPath, outputPath, {
                text: watermarkText,
                fontSize: 20,
                position: 'bottom-right',
                opacity: 0.7
            });

            if (tempPath !== inputPath && fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }

            console.log(`Combined watermark added successfully`);
            return outputPath;

        } catch (error) {
            console.error('Error adding combined watermark:', error);
            throw error;
        }
    }

    /**
     * Add timestamp watermark (for live streams/recordings)
     */
    async addTimestampWatermark(inputPath, outputPath, options = {}) {
        try {
            const {
                position = 'top-left',
                fontSize = 16,
                format = '%Y-%m-%d %H\\:%M\\:%S'
            } = options;

            const safeInputPath = this._validatePath(inputPath);
            const safeOutputPath = this._validatePath(outputPath);
            const safeFontSize = this._validateNumber(fontSize, 8, 200, 16);
            const positionFilter = this.getPositionFilter(position, safeFontSize);

            const filterComplex = `drawtext=text='%{localtime\\:${format}}':` +
                `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:` +
                `fontsize=${safeFontSize}:` +
                `fontcolor=white@0.8:` +
                `${positionFilter}:` +
                `box=1:boxcolor=black@0.5:boxborderw=5`;

            console.log(`Adding timestamp watermark`);

            const args = [
                '-i', safeInputPath,
                '-vf', filterComplex,
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                '-c:a', 'copy',
                safeOutputPath, '-y'
            ];

            await execFileAsync('ffmpeg', args);

            console.log(`Timestamp watermark added`);
            return safeOutputPath;

        } catch (error) {
            console.error('Error adding timestamp watermark:', error);
            throw error;
        }
    }

    /**
     * Get video dimensions
     */
    async getVideoDimensions(videoPath) {
        try {
            const safePath = this._validatePath(videoPath);
            const { stdout } = await execFileAsync('ffprobe', [
                '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height',
                '-of', 'csv=p=0',
                safePath
            ]);
            const [width, height] = stdout.trim().split(',').map(Number);

            return { width, height };
        } catch (error) {
            console.error('Error getting video dimensions:', error);
            return { width: 1920, height: 1080 };
        }
    }

    /**
     * Get position filter for text watermark
     */
    getPositionFilter(position, fontSize) {
        const padding = 20;

        const positions = {
            'top-left': `x=${padding}:y=${padding}`,
            'top-right': `x=w-tw-${padding}:y=${padding}`,
            'bottom-left': `x=${padding}:y=h-th-${padding}`,
            'bottom-right': `x=w-tw-${padding}:y=h-th-${padding}`,
            'center': `x=(w-tw)/2:y=(h-th)/2`,
            'top-center': `x=(w-tw)/2:y=${padding}`,
            'bottom-center': `x=(w-tw)/2:y=h-th-${padding}`
        };

        return positions[position] || positions['bottom-right'];
    }

    /**
     * Get position filter for logo watermark
     */
    getLogoPositionFilter(position, padding = 20) {
        const positions = {
            'top-left': `${padding}:${padding}`,
            'top-right': `W-w-${padding}:${padding}`,
            'bottom-left': `${padding}:H-h-${padding}`,
            'bottom-right': `W-w-${padding}:H-h-${padding}`,
            'center': `(W-w)/2:(H-h)/2`,
            'top-center': `(W-w)/2:${padding}`,
            'bottom-center': `(W-w)/2:H-h-${padding}`
        };

        return positions[position] || positions['bottom-right'];
    }

    /**
     * Process video with watermark based on channel settings
     */
    async processVideoWatermark(videoId, videoPath, channelSettings = {}) {
        try {
            if (!this.watermarkEnabled) {
                console.log('Watermarking is disabled');
                return videoPath;
            }

            const outputPath = videoPath.replace(
                path.extname(videoPath),
                `_watermarked${path.extname(videoPath)}`
            );

            const {
                watermarkType = 'text',
                watermarkText = null,
                watermarkLogo = null,
                channelName = null,
                enableTimestamp = false
            } = channelSettings;

            switch (watermarkType) {
                case 'text':
                    await this.addTextWatermark(videoPath, outputPath, {
                        text: watermarkText || channelName || 'ReelShorts.live'
                    });
                    break;

                case 'logo':
                    if (watermarkLogo) {
                        await this.addLogoWatermark(videoPath, outputPath, watermarkLogo);
                    } else {
                        throw new Error('Logo path required for logo watermark');
                    }
                    break;

                case 'combined':
                    await this.addCombinedWatermark(videoPath, outputPath, {
                        text: watermarkText,
                        logoPath: watermarkLogo,
                        channelName
                    });
                    break;

                case 'timestamp':
                    await this.addTimestampWatermark(videoPath, outputPath);
                    break;

                default:
                    await this.addTextWatermark(videoPath, outputPath, {
                        text: channelName || 'ReelShorts.live'
                    });
            }

            if (enableTimestamp && watermarkType !== 'timestamp') {
                const timestampPath = outputPath.replace('.mp4', '_ts.mp4');
                await this.addTimestampWatermark(outputPath, timestampPath);
                fs.unlinkSync(outputPath);
                return timestampPath;
            }

            return outputPath;

        } catch (error) {
            console.error('Error processing video watermark:', error);
            throw error;
        }
    }

    /**
     * Check if watermarking is enabled
     */
    isEnabled() {
        return this.watermarkEnabled;
    }
}

module.exports = new WatermarkService();
