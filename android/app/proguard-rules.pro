# Retrofit / OkHttp
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-keepattributes Signature
-keepattributes *Annotation*

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class com.shanye.coffee.data.remote.dto.** {
    *** Companion;
    <fields>;
}
-keepclasseswithmembers class com.shanye.coffee.data.remote.dto.** {
    kotlinx.serialization.KSerializer serializer(...);
}
