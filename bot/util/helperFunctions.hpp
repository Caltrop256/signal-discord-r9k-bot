#pragma once
#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <cmath>
#include <cstring>
#if defined(_WIN32)
/**/#define WIN32_LEAN_AND_MEAN
/**/#include <windows.h>
#elif defined(__linux__)
/**/#include <unistd.h>
#endif
#ifdef max
/**/#undef max
#endif

using namespace v8;
static uint64_t allocThresholdMB = 50;
//i have no legitimate reason for doing this other than i think user defined operators are cool .w.
constexpr unsigned long long int operator "" MB(unsigned long long int size) noexcept
{
    return size * 1048576;
}
bool CanAllocate(uint64_t toAllocate)
{
    #if defined(_WIN32)   
    /**/ MEMORYSTATUSEX statex{ 0 };
    /**/statex.dwLength = sizeof(statex);
    /**/GlobalMemoryStatusEx(&statex);
    /**/return statex.ullAvailPageFile > toAllocate + allocThresholdMB * 1MB; //immagine having less than 250 mb on your system
    #elif defined(__linux__)
    /**/uint64_t avPages = sysconf(_SC_AVPHYS_PAGES);
    /**/uint64_t pageSize = sysconf(_SC_PAGESIZE);
    /**/return (avPages * pageSize) > toAllocate + allocThresholdMB * 1MB; //that's hella cringe bro
    #else
    /**/static_assert("UNSUPPORTED OS"); //Piss off macOS, lol.
    #endif
}

#define IsType(RequestedType) constexpr (std::is_same_v<RequestedType,ToCheck>)
template<typename ToCheck, typename CurrentType>
bool TypeCheck(const Local<CurrentType>& value)
{
    if IsType(Number)
        return value->IsNumber();
    else if IsType(Date)
        return value->IsDate();
    else if IsType(Array)
        return value->IsArray();
    else if IsType(String)
        return value->IsString();
    else if IsType(BigInt)
        return value->IsBigInt();
}
#undef IsType
template<int length>
bool TryCreateString(Isolate* isolate, const char(&string)[length], Local<String>* stringObj)
{
    return String::NewFromUtf8(isolate, string, NewStringType::kNormal, length - 1).ToLocal(stringObj);
}

#define THROW_GENERIC(errorType,errorTypeUppercase) \
template<int length> \
bool Throw ## errorType(Isolate* isolate,const char(&message)[length]) \
{ \
    Local<String> errorMessage; \
    if (TryCreateString(isolate, message, &errorMessage)) \
    { \
        isolate->ThrowException(Exception::errorType(errorMessage)); \
        return true; \
    } \
    printf("[FATAL " #errorTypeUppercase "] %s", message); \
    return false; \
}
THROW_GENERIC(Error, "ERROR");
THROW_GENERIC(TypeError, "TYPE ERROR");
THROW_GENERIC(RangeError, "RANGE ERROR");

template<int length>
Local<String> CreateString(Isolate* isolate,const char(&string)[length], bool* fatalError)
{
    Local<String> toReturn;

    if (!TryCreateString(isolate,string,&toReturn))
    {
        ThrowError(isolate,"(FATAL) An error occured while trying to create a string. If you are seeing this, then shit has really hit the fan");
        if (fatalError)
            *fatalError = true;
        return Local<String>();
    }
    return toReturn;
}

template<typename T, int length>
bool TryGetObjectMember(Isolate* isolate,const Local<Context>& context, const Local<Object>& object, const char(&key)[length], Local<T>* out, bool* fatalError)
{
    Local<String> keyStr = CreateString(isolate,key, fatalError);
    if (fatalError && *fatalError)
        return false;
    Local<Value> objValue;
    if (!object->Get(context, keyStr).ToLocal(&objValue))
    {
        ThrowError(isolate,"(FATAL) An error occured while trying to access an object's key. If you are seeing this, then that's a sign that something very wrong may have happened");
        if (fatalError)
            *fatalError = true;
        return false;
    }
    if (!TypeCheck<T>(objValue))
        return false;
    if (!out)
        return true;
    *out = objValue.As<T>();
    return true;

}
template<typename T>
bool TryGetArrayIndex(Isolate* isolate,const Local<Context>& context, const Local<Array>& arr, int32_t index, Local<T>* out, bool* fatalError)
{
    Local<Value> objValue;
    if (!arr->Get(context, index).ToLocal(&objValue))
    {
        ThrowError(isolate,"(FATAL) An error occured while trying to access an array's index. If you are seeing this, then be careful, as something very bad may have happened");
        if (fatalError)
            *fatalError = true;
        return false;
    }
    if (!TypeCheck<String>(objValue))
        return false;
    if (!out)
        return true;
    *out = objValue.As<T>();
    return true;
}

template<typename DataType>
char* WriteData(char* pointer, DataType data)
{
    *((DataType*)pointer) = data;
    return (char*)(((DataType*)pointer) + 1);
}
char* WriteDataArray(Isolate* isolate, char* pointer, const Local<String>& dataStr, uint16_t dataStrLen)
{
    dataStr->WriteUtf8(isolate, pointer, dataStrLen);
    return pointer + dataStrLen;
}

struct BufferInfo
{
    uint64_t bufferSize;
    char* beginPointer;
    char* currentPointer;
};
template<typename DataType>
bool MoveData(BufferInfo& buffer, DataType* outData)
{
    if ((buffer.bufferSize - sizeof(DataType)) < (buffer.currentPointer - buffer.beginPointer))
        return false;
    *outData = *((DataType*)buffer.currentPointer);
    buffer.currentPointer = (char*)(((DataType*)buffer.currentPointer) + 1);
    return true;
}