export IMAGE_TAG=$1
export AARCH=`uname -m`
docker build -f Dockerfile.xos-gui-builder -t cachengo/xos-gui-builder-$AARCH:$IMAGE_TAG .
docker push cachengo/xos-gui-builder-$AARCH:$IMAGE_TAG
docker build -t cachengo/xos-gui-$AARCH:$IMAGE_TAG .
docker push cachengo/xos-gui-$AARCH:$IMAGE_TAG