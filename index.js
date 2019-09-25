const AWS = require('aws-sdk');
const { storage } = require('image-steam');

const StorageBase = storage.Base;

module.exports = class StorageAWSS3 extends StorageBase {
  constructor(opts = {}) {
    super(opts);

    const { region, bucket, lifecycle } = opts;
    if (region) {
      AWS.config.update({ region });
    }
    this.s3 = new AWS.S3({ });
    this.Bucket = bucket;
  }

  fetch({ etag } = {}, originalPath, stepsHash, cb) {
    const imagePath = stepsHash
      ? `isteam/${originalPath}/${stepsHash}`
      : originalPath
    ;
    const Key = imagePath.split('/').map(p => decodeURIComponent(p)).join('/');
  
    const { Bucket } = this;
    const params = { Bucket, Key };
    if (etag) params.IfNoneMatch = etag;

    this.s3.getObject(params, (err, data) => {
      if (err) return void cb(err);

      const info = Object.assign(
        { path: encodeURIComponent(originalPath), stepsHash },
        getMetaFromData(data)
      );

      cb(null, info, data.Body);
    });
  }

  store(opts, originalPath, stepsHash, image, cb) {
    image.info.stepsHash = stepsHash;

    const { Bucket } = this;
    const Key = `isteam/${originalPath}/${stepsHash}`;
    const Body = image.buffer;
    const Metadata = getMetaFromImage(image.info);
    const ContentType = image.contentType || 'application/octet-stream'; // default to binary if unknown
    const params = { Bucket, Key, Body, Metadata, ContentType };
    this.s3.upload(params, (err, data) => {
      if (err) return void cb(err);
  
      cb();
    });
  }

  touch(opts, originalPath, stepsHash, image, cb) {
    image.info.stepsHash = stepsHash;

    const { Bucket } = this;
    const Key = `isteam/${originalPath}/${stepsHash}`;
    const CopySource = `/${Bucket}/${Key}`;
    const MetadataDirective = 'REPLACE';
    const Metadata = getMetaFromImage(image.info);
    const ContentType = image.contentType || 'application/octet-stream'; // default to binary if unknown
    const params = { Bucket, Key, CopySource, MetadataDirective, Metadata, ContentType };

    this.s3.copyObject(params, cb);
  }

  deleteCache(opts, originalPath, cb) {
    const imagePath = `isteam/${originalPath}`;

    const { Bucket } = this;
    
    const _listAndDelete = (dir, resumeKey, cb) => {
      this.list(dir, { resumeKey }, (err, { files, resumeKey } = {}) => {
        if (err) return void cb(err);

        // no more files, we're done
        if (files.length === 0) return void cb();

        // only provide the Key
        const Delete = { Objects: files.map(({ Key }) => ({ Key })) };
        const params = { Bucket, Delete };
        this.s3.deleteObjects(params, (err, data) => {
          if (err) return void cb(err);

          if (!resumeKey) return cb(); // no more to delete 

          // continue recursive deletions
          _listAndDelete(dir, resumeKey, cb);
        });
      });
    };

    _listAndDelete(imagePath, null, cb);    
  }

  list(originalPath, { resumeKey, maxCount = 1000 } = {}, cb) {
    const Prefix = `${originalPath}/`;
    const { Bucket } = this;
    const params = {
      Bucket,
      Delimiter: '/',
      EncodingType: 'url',
      FetchOwner: false,
      ContinuationToken: resumeKey,
      MaxKeys: maxCount,
      Prefix
    };

    this.s3.listObjectsV2(params, (err, data) => {
      if (err) return void cb(err);

      cb(null, {
        resumeKey: data.IsTruncated ? data.NextContinuationToken : undefined,
        files: data.Contents
      });
    });
  }
}

function getMetaFromData({ Metadata = {}, LastModified }) {
  let info = {};

  const isteamMeta = Metadata.isteam;
  if (isteamMeta) {
    info = JSON.parse(isteamMeta);
  }

  if (LastModified) {
    info.lastModified = LastModified;
  }

  return info;
}

function getMetaFromImage(info) {
  return {
    isteam: JSON.stringify(info)
  }
}