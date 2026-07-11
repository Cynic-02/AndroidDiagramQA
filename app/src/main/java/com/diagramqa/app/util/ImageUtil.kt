package com.diagramqa.app.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID

/**
 * Image-related helpers: copy a picked [Uri] into app-private storage, downscale
 * huge photos so we don't OOM, normalize EXIF rotation, and produce a [Uri]
 * we can share via [FileProvider].
 */
object ImageUtil {

    private const val MAX_DIMENSION = 1920
    private const val JPEG_QUALITY = 88

    /**
     * Copies the picked image into the app's internal files directory and
     * returns the resulting [File]. The file is downscaled and EXIF-rotated.
     */
    suspend fun copyToInternal(context: Context, source: Uri): File =
        withContext(Dispatchers.IO) {
            val outDir = File(context.filesDir, "diagrams").apply { mkdirs() }
            val outFile = File(outDir, "diagram_${UUID.randomUUID()}.jpg")

            val input: InputStream = context.contentResolver.openInputStream(source)
                ?: throw IllegalStateException("Cannot open input stream for $source")

            // First decode bounds to compute sample size
            val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeStream(input, null, opts)
            input.close()

            val sample = computeSampleSize(opts.outWidth, opts.outHeight)

            val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sample }
            val input2 = context.contentResolver.openInputStream(source)!!
            val decoded = BitmapFactory.decodeStream(input2, null, decodeOpts)
            input2.close()

            if (decoded == null) {
                // Fallback: raw copy
                context.contentResolver.openInputStream(source)?.use { ins ->
                    FileOutputStream(outFile).use { fos -> ins.copyTo(fos) }
                }
                return@withContext outFile
            }

            val oriented = applyExifOrientation(context, source, decoded)
            FileOutputStream(outFile).use { fos ->
                oriented.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, fos)
            }
            if (oriented != decoded) decoded.recycle()
            outFile
        }

    fun shareUri(context: Context, file: File): Uri =
        FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )

    private fun computeSampleSize(width: Int, height: Int): Int {
        if (width <= 0 || height <= 0) return 1
        var sample = 1
        val longest = maxOf(width, height)
        while (longest / sample > MAX_DIMENSION * 2) sample *= 2
        return sample
    }

    private fun applyExifOrientation(context: Context, source: Uri, bmp: Bitmap): Bitmap {
        return try {
            val exif = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                ExifInterface(context.contentResolver.openInputStream(source)!!)
            } else {
                @Suppress("DEPRECATION")
                ExifInterface(source.path ?: return bmp)
            }
            val rotation = when (
                exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
            ) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90
                ExifInterface.ORIENTATION_ROTATE_180 -> 180
                ExifInterface.ORIENTATION_ROTATE_270 -> 270
                else -> 0
            }
            if (rotation == 0) bmp
            else {
                val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
                Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, matrix, true)
            }
        } catch (_: Throwable) {
            bmp
        }
    }

    /**
     * Downsamples and returns the dimensions for a thumbnail without loading
     * the full image into memory.
     */
    fun decodeSampled(path: String, reqWidth: Int, reqHeight: Int): Bitmap? {
        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, opts)
        var sample = 1
        while (opts.outWidth / sample > reqWidth * 2 || opts.outHeight / sample > reqHeight * 2) {
            sample *= 2
        }
        val decode = BitmapFactory.Options().apply { inSampleSize = sample }
        return BitmapFactory.decodeFile(path, decode)
    }
}
