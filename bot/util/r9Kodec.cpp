#include "helperFunctions.hpp"
struct InputData
{
    int64_t timestamp;
    uint64_t guildID;
    uint64_t requestedBy;
    uint32_t messageArrLength;
    std::unique_ptr <uint16_t[]> messageLengthArr;
    uint32_t attributeArrLength;
};
struct free_delete
{
    void operator()(void* x) { free(x); }
};

const char magicNumber[8] = "r9k!uwu";
#define throwError(ErrorType,ErrorMessage) {if(!fatalError)Throw ## ErrorType(isolate,ErrorMessage);return;}
void ToBuffer(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    bool fatalError = false;

    if (args.Length() == 0)
        throwError(Error, "Expecting at least 1 argument, got none");
    if (args.Length() > 1)
        throwError(Error, "Expecting only 1 argument, got multiple");
    const Local<Value>& arg = args[0];
    if (!arg->IsObject())
        throwError(TypeError, "Argument must be of type 'Object'");

    const Local<Object>& customObj = arg.As<Object>();
    ::InputData toStore{ 0 };
    uint64_t totalSize = 0;

    #pragma region timestamp
    Local<Number> timestamp;
    if (!TryGetObjectMember(isolate,context, customObj, "timestamp", &timestamp, &fatalError))
    {
        if (fatalError)
            return;
        Local<Date> timestampDate;
        if (!TryGetObjectMember(isolate, context, customObj, "timestamp", &timestampDate, &fatalError))
            throwError(TypeError, "Member 'timestamp' must be present and of either type 'number' or 'Date'");
        if (!timestampDate->ToNumber(context).ToLocal(&timestamp))
            throwError(TypeError, "An error occured while trying to convert member 'timestamp' from  type 'Date' into type 'number'");
    }
    double tempVal = timestamp->Value();
    if (!std::isfinite(tempVal))
        throwError(RangeError, "Member 'timestamp' cannot be NaN or Infinity");
    if((tempVal > 8640000000000000.0) || (tempVal < -8640000000000000.0))
        throwError(RangeError,"Member 'timestamp' cannot exceed the range of a valid date (See http://ecma-international.org/ecma-262/5.1/#sec-15.9.1.1)")
    toStore.timestamp = tempVal;
    totalSize += sizeof(toStore.timestamp);
    #pragma endregion

    #pragma region guildID
    Local<BigInt> guildID;
    if (!TryGetObjectMember(isolate, context, customObj, "guildID", &guildID, &fatalError))
    {
        if (fatalError)
            return;
        Local<String> guildIDStr;
        if (!TryGetObjectMember(isolate, context, customObj, "guildID", &guildIDStr, &fatalError))
            throwError(TypeError, "Member 'guildID' must be present and of either type 'string' or 'BigInt'");
        if (!guildIDStr->ToBigInt(context).ToLocal(&guildID))
            throwError(Error, "An error occured while trying to convert member 'guildID' from type 'string' into type 'BigInt'");
    }
    bool lossless = true;
    toStore.guildID = guildID->Uint64Value(&lossless);
    if (!lossless)
        throwError(RangeError, "Member 'guildID' cannot be larger than 18,446,744,073,709,551,615 ((2^64) - 1) or less than 0");
    totalSize += sizeof(toStore.guildID);
    #pragma endregion

    #pragma region requestedBy
    Local<BigInt> requestedBy;
    if (!TryGetObjectMember(isolate, context, customObj, "requestedBy", &requestedBy, &fatalError))
    {
        if (fatalError)
            return;
        Local<String> requestedByStr;
        if (!TryGetObjectMember(isolate, context, customObj, "requestedBy", &requestedByStr, &fatalError))
            throwError(TypeError, "Member 'requestedBy' must be present and of either type 'string' or 'BigInt'");
        if (!requestedByStr->ToBigInt(context).ToLocal(&requestedBy))
            throwError(Error, "An error occured while trying to convert member 'requestedBy' from type 'string' into type 'BigInt'");
    }
    toStore.requestedBy = requestedBy->Uint64Value(&lossless);
    if (!lossless)
        throwError(RangeError, "Member 'requestedBy' cannot be larger than 18,446,744,073,709,551,615 ((2^64) - 1) or less than 0");
    totalSize += sizeof(toStore.requestedBy);
    #pragma endregion

    #pragma region messages
    Local<Array> messageArr;
    if (!TryGetObjectMember(isolate, context, customObj, "messages", &messageArr, &fatalError))
        throwError(TypeError, "Member 'messages' must be present and of type 'Array'");
    uint32_t messageArrLen = toStore.messageArrLength = messageArr->Length();
    if (!CanAllocate(sizeof(uint16_t) * messageArrLen))
        throwError(Error, "Not enough memory to allocate message length array");
    toStore.messageLengthArr = std::make_unique<uint16_t[]>(messageArrLen);
    totalSize += sizeof(toStore.messageArrLength);
    for (uint32_t index = 0; index < messageArrLen; index++)
    {
        Local<String> message;
        if (!TryGetArrayIndex(isolate, context, messageArr, index, &message, &fatalError))
            throwError(TypeError, "Indices of member 'messages' must be of type 'String'");
        
        int tempLen = message->Utf8Length(isolate);
        if (tempLen > std::numeric_limits<uint16_t>::max())
            throwError(RangeError, "Indices of member 'messages' must not exceed a size of 65,535 ((2^16)-1) bytes");

        uint16_t strLen = toStore.messageLengthArr[index] = tempLen;
        totalSize += sizeof(strLen) + strLen;
    }
    #pragma endregion

    #pragma region attributes
    Local<Array> attributeArr;
    if (!TryGetObjectMember(isolate, context, customObj, "attributes", &attributeArr, &fatalError))
        throwError(TypeError, "Member 'attributes' must be present and of type 'Array'");
    uint32_t attributeArrLen = toStore.attributeArrLength = attributeArr->Length();
    totalSize += sizeof(toStore.attributeArrLength);
    for (uint32_t index = 0; index < attributeArrLen; index++)
    {
        Local<String> attribute;
        if (!TryGetArrayIndex(isolate, context, attributeArr, index, &attribute, &fatalError))
            throwError(TypeError, "Indices of member 'attributes' must be of type 'String'");
        uint8_t strLen = attribute->Utf8Length(isolate);
        if (strLen != 32)
            throwError(RangeError, "Indices of member 'attributes' must have an exact size of 32 bytes");
    }
    totalSize += (toStore.attributeArrLength * 32ull);
    #pragma endregion
    
    totalSize += sizeof(magicNumber);
    if (totalSize > node::Buffer::kMaxLength)
        throwError(Error, "Total size of object exceeds javascript's maximum buffer size of 1gb");
    if (!CanAllocate(totalSize))
        throwError(Error, "Not enough memory to allocate buffer");

    char* buffer = (char*)malloc(totalSize);
    char* bufferStart = buffer;
    std::unique_ptr<char, free_delete> memoryLeakBGon(buffer);
    memcpy(buffer, magicNumber, sizeof(magicNumber));
    buffer += sizeof(magicNumber);

    buffer = WriteData(buffer, toStore.timestamp);
    buffer = WriteData(buffer, toStore.guildID);
    buffer = WriteData(buffer, toStore.requestedBy);

    buffer = WriteData(buffer, toStore.messageArrLength);
    for (uint32_t index = 0; index < messageArrLen; index++)
    {
        Local<String> message;
        uint16_t strLen = toStore.messageLengthArr[index];
        if (!TryGetArrayIndex(isolate, context, messageArr, index, &message, &fatalError))
            throwError(Error, "(FATAL) Uh this should not even be possible...is this some getter magic?");
        buffer = WriteData(buffer, strLen);
        buffer = WriteDataArray(isolate,buffer, message, strLen);
    }

    buffer = WriteData(buffer, toStore.attributeArrLength);
    for (uint32_t index = 0; index < attributeArrLen; index++)
    {
        Local<String> attribute;
        if (!TryGetArrayIndex(isolate, context, attributeArr, index, &attribute, &fatalError))
            throwError(Error, "(FATAL) What, this error should't be possible...what did you break?");
        buffer = WriteDataArray(isolate,buffer, attribute, 32);
    }
    
    Local<Object> toReturn;
    if(!node::Buffer::New(isolate, bufferStart, totalSize, [](char* data, void* hint)->void {free(data); }, nullptr).ToLocal(&toReturn))
        throwError(Error, "(FATAL) An error occured while trying to create Buffer. If you are seeing this, then it's probably already too late");

    memoryLeakBGon.release();
    args.GetReturnValue().Set(toReturn);
}
struct OutputData
{
    int64_t timestamp;
    uint64_t guildID;
    uint64_t requestedBy;
    uint32_t messageArrLength;
    uint32_t attributeArrLength;
};
#define throwError(ErrorType,Message) {Throw ## ErrorType(isolate,Message);return;}
#define throwEOF(memberName) { ThrowError(isolate,"Reached EOF while parsing " memberName); return;  }
void FromBuffer(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    bool fatalError = false;

    if (args.Length() == 0)
        throwError(Error, "Expecting at least 1 argument, got none");
    if (args.Length() > 1)
        throwError(Error, "Expecting only 1 argument, got multiple");
    const Local<Value>& arg = args[0];
    if (!node::Buffer::HasInstance(arg))
        throwError(TypeError, "Argument must be of type 'Buffer'");

    uint64_t bufferSize = node::Buffer::Length(arg);
    constexpr uint64_t minimumSize = sizeof(magicNumber) + sizeof(OutputData::timestamp) + sizeof(OutputData::guildID) + sizeof(OutputData::requestedBy) + sizeof(OutputData::messageArrLength) + sizeof(OutputData::attributeArrLength);
    if (bufferSize < minimumSize)
        throwError(RangeError, "File doesn't match minimum file size requirement");
    if (!CanAllocate(bufferSize))
        throwError(Error, "Not enough memory to copy data");

    char* bufferData = node::Buffer::Data(arg);
    if (strcmp(bufferData, magicNumber))
        throwError(Error, "File is not a valid .r9k format");

    BufferInfo bufferInfo{ bufferSize, bufferData,bufferData + sizeof(magicNumber) };
    OutputData outData{ 0 };

    MoveData(bufferInfo, &outData.timestamp);
    if ((outData.timestamp > 8640000000000000.0) || (outData.timestamp < -8640000000000000.0))
        throwError(RangeError, "Timestamp exceeds range of a valid date (See http://ecma-international.org/ecma-262/5.1/#sec-15.9.1.1)")
    MoveData(bufferInfo, &outData.guildID);
    MoveData(bufferInfo, &outData.requestedBy);

    MoveData(bufferInfo, &outData.messageArrLength);
    char* messageArr = bufferInfo.currentPointer;
    #define isEOF(lookahead) ((bufferSize - lookahead) < (bufferInfo.currentPointer - bufferInfo.beginPointer))
    for (uint32_t index = 0; index < outData.messageArrLength; index++)
    {
        uint16_t messageLen;
        if (!MoveData(bufferInfo, &messageLen) || isEOF(messageLen))
            throwEOF("Message Array");
        bufferInfo.currentPointer += messageLen;
    }

    MoveData(bufferInfo, &outData.attributeArrLength);
    char* attributeArr = bufferInfo.currentPointer;
    for (uint32_t index = 0; index < outData.attributeArrLength; index++)
    {
        if (isEOF(32))
            throwEOF("Attribute Array");
        bufferInfo.currentPointer += 32;
    }

    if (!isEOF(1))
        throwError(Error, "Found unexpected data after finishing parsing the buffer");

    #define setObjDieIfFatal(obj,key,value)  if(!obj->Set(context, key, value).IsJust()) {throwError(Error,"(FATAL) Unable to set object member '" #value "'...oh boy, that's not good");return;}
    #define createStringDieIfFatal(string) CreateString(isolate,string,&fatalError);if(fatalError)return;
    
    Local<Object> toReturn = v8::Object::New(isolate);
    Local<Number> timestamp = Number::New(isolate,outData.timestamp);
    Local<String> timestampKey = createStringDieIfFatal("timestamp");
    setObjDieIfFatal(toReturn,timestampKey, timestamp);

    Local<String> guildID;
    if (!BigInt::New(isolate, outData.guildID)->ToString(context).ToLocal(&guildID))
        throwError(Error, "(FATAL) An error occured while trying to convert a BigInt to a string...this is not a very wholesome 100 moment, ngl");
    Local<String> guildIDKey = createStringDieIfFatal("guildID");
    setObjDieIfFatal(toReturn, guildIDKey, guildID);

    Local<String> requestedBy;
    if (!BigInt::New(isolate, outData.requestedBy)->ToString(context).ToLocal(&requestedBy))
        throwError(Error, "(FATAL) An error occured while trying to convert a BigInt to a string...kinda cringe tbh");
    Local<String> requestedByKey = createStringDieIfFatal("requestedBy");
    setObjDieIfFatal(toReturn, requestedByKey, requestedBy);

    Local<String> messagesKey = createStringDieIfFatal("messages");
    Local<Array> messages = Array::New(isolate, outData.messageArrLength);
    setObjDieIfFatal(toReturn, messagesKey, messages);

    Local<String> attributesKey = createStringDieIfFatal("attributes");
    Local<Array> attributes = v8::Array::New(isolate, outData.attributeArrLength);
    setObjDieIfFatal(toReturn, attributesKey, attributes);

    bufferInfo.currentPointer = messageArr;
    for (uint32_t index = 0; index < outData.messageArrLength; index++)
    {
        uint16_t messageLen;
        if (!MoveData(bufferInfo, &messageLen))
            throwEOF("Message Array...this shouldn't even be possible I literally already checked for this, how did I fuck up this badly?!?!");
        Local<String> message;
        if (!String::NewFromUtf8(isolate, bufferInfo.currentPointer, NewStringType::kNormal, messageLen).ToLocal(&message))
            throwError(Error, "(FATAL) An error occured while trying to create a string...i've given up trying to come up with unique comments to identify where the error occured");
        setObjDieIfFatal(messages, index, message);
        bufferInfo.currentPointer += messageLen;
    }

    bufferInfo.currentPointer = attributeArr;
    for (uint32_t index = 0; index < outData.attributeArrLength; index++)
    {
        Local<String> attribute;
        if (!String::NewFromUtf8(isolate, bufferInfo.currentPointer, NewStringType::kNormal, 32).ToLocal(&attribute))
            throwError(Error, "(FATAL) An error occured while trying to create a string...pee pee poo poo");
        setObjDieIfFatal(attributes, index, attribute);
        bufferInfo.currentPointer += 32;
    }
    
    args.GetReturnValue().Set(toReturn);
}
//#include "../node_modules/nan/nan.h"
#define CREATE_FUNCTION(funcName,handleName) \
    Local<String> handleName ## Key = CreateString(isolate, #handleName, &fatal); \
    if (fatal) \
        return; \
    Local<Function> handleName; \
    if (!FunctionTemplate::New(isolate, funcName)->GetFunction(context).ToLocal(&handleName)) \
    { \
        ThrowError(isolate, "An error occured while trying to create " #handleName " function...owo uwu"); \
        return; \
    }
void Init(Local<Object> exports) {
    Isolate* isolate = exports->GetIsolate();
    Local<Context> context = exports->CreationContext();
    bool fatal = false;
    CREATE_FUNCTION(ToBuffer, toBuffer);
    CREATE_FUNCTION(FromBuffer, fromBuffer);
    exports->Set(context,toBufferKey,toBuffer);
    exports->Set(context, fromBufferKey, fromBuffer);

}

NODE_MODULE(myEpicModule, Init)