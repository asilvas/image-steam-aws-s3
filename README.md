# image-steam-aws-s3
[AWS S3](https://www.npmjs.com/package/aws-sdk) client for
[Image Steam](https://github.com/asilvas/node-image-steam).
If you're using AWS, you're in the right place. If all you need
is an S3-compatible client, check out [image-steam-s3](https://github.com/asilvas/image-steam-s3).


## Options

```ecmascript 6
import isteamAWSS3 from 'image-steam-awss3';

const s3 = new isteamAWSS3({
  region: 'us-west-2',
  bucket: 'isteam'
});
```

| Option | Type | Default | Info |
| --- | --- | --- | --- |
| region | `string` | *required* | AWS Region of S3 bucket |
| bucket | `string` | *required* | Unique name of S3 bucket |


## Usage

Example:

```ecmascript 6
import isteam from 'image-steam';

const options = {
  storage: {
    app: {
      static: {
        driver: 'http',
        endpoint: 'https://some-endpoint.com'
      }
    },
    cache: {
      driverPath: 'image-steam-awss3',
      options: {
        region: 'us-west-2',
        bucket: 'isteam-cache'
      }
    }
  }
}

http.createServer(new isteam.http.Connect(options).getHandler())
  .listen(13337, '127.0.0.1')
;
```
