const mongoose = require('mongoose')
const _user = require('../models/user.model')
const _groupMembers = require('../models/group_members.model')
const _group = require('../models/groups.model')
const _message = require('../models/messages.model')
const _emotion = require('../models/emotion.model')
const _friend = require('../models/friend.model')


class SocketService {
    async connection(socket) {
        var id;
        console.log('có người kết nối: ' + socket.id);
        //khi người dùng online
        socket.on('client-verifi', async function (ID) {
            id = ID
            await _user.updateOne({ _id: id }, { $set: { socketId: socket.id, is_online: true } });
            await _groupMembers.updateMany({ user_id: id }, { $set: { is_online: true } });
            const list_online = await _user.find({is_online: true})


            const friend = await _friend.find()
            
            var friend_id = []
            for (const item of friend) {
                friend_id.push(
                    {
                        sender_id: item.sender_id,
                        receiver_id: item.receiver_id
                    }
                )
                
            }
            //hiển thị danh sách những người online
            socket.emit('server-list-online', list_online, friend_id)
        })

        //chọn đối tượng muốn nhắn tin
        socket.on('client-receiver', async(userid, usernamereceiver) => {
            try {
                const userreceiver = await _user.findOne({name: usernamereceiver});
                const contentmes = await _message.aggregate([
                    {
                        $match:{
                            $or: [
                            { sender_id: userid, receiver_id: userreceiver.id },
                            { receiver_id: userid, sender_id: userreceiver.id }
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: "emotions",
                            let: { messageId: "$_id" },
                            pipeline: [
                                {
                                $match: {
                                    $expr: {
                                    $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                    }
                                }
                                }
                            ],
                            as: "emotions"
                        }
                    },
                    {
                        $sort: {
                          'createdAt': 1,
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            messages_content: 1,
                            sender_id: 1,
                            receiver_id: 1,
                            file_name: 1,
                            emotions: "$emotions.emotion"
                        }
                    }
            ])
            const group_member = await _groupMembers.find({user_id: id})
            if(group_member){
                var arrgroup_id = []
                for(var i=0; i<group_member.length; i++){
                    arrgroup_id.push(group_member[i].group_id)
                }
                const group_name = await _group.find({_id: {$in: arrgroup_id}})
                for(var i=0; i<group_name.length; i++){
                    socket.leave(group_name[i].name);
                }
            }
            socket.emit('server-receiver',usernamereceiver, contentmes)

            } catch (error) {
                console.error(error)
            }
        })

        //gửi nhắn tin
        socket.on('client-send-message', async (mes, sender, receiver) => {
            try {
                const userreceiver = await _user.findOne({name: receiver})
                const groupreceiver = await _group.findOne({name: receiver})
                var checkuser
                var checkgroup
                if(userreceiver){
                    checkuser = await _message.findOne({
                        $or: [
                            { sender_id: sender, receiver_id: userreceiver.id },
                            { receiver_id: sender, sender_id: userreceiver.id }
                            ]
                    })
                }
                if(groupreceiver){
                    checkgroup = await _message.findOne({sender_id: sender, group_id:groupreceiver.id})
                }
                if(checkuser){
                    await _message.create({
                        sender_id: sender,
                        receiver_id: userreceiver.id,
                        messages_content: mes
                    })
                    const contentmes = await _message.aggregate([
                        {
                            $match:{
                                $or: [
                                { sender_id: sender, receiver_id: userreceiver.id },
                                { receiver_id: sender, sender_id: userreceiver.id }
                                ]
                            }
                        },
                        {
                            $lookup: {
                                from: "emotions",
                                let: { messageId: "$_id" },
                                pipeline: [
                                    {
                                    $match: {
                                        $expr: {
                                        $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                        }
                                    }
                                    }
                                ],
                                as: "emotions"
                            }
                        },
                        {
                            $sort: {
                              'createdAt': 1,
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                messages_content: 1,
                                sender_id: 1,
                                receiver_id: 1,
                                file_name: 1,
                                emotions: "$emotions.emotion"
                            }
                        }
                ])
                    _io.to(userreceiver.socketId).emit('server-send-mes', contentmes)
                    socket.emit('server-send-mes', contentmes)
                }
                if(checkgroup){
                    await _message.create({
                        sender_id: sender,
                        group_id: groupreceiver.id,
                        messages_content: mes
                    })
                    const contentmes = await _message.aggregate([
                        {
                            $match:{sender_id: sender, group_id:groupreceiver.id}
                        },
                        {
                            $lookup: {
                                from: "emotions",
                                let: { messageId: "$_id" },
                                pipeline: [
                                    {
                                    $match: {
                                        $expr: {
                                        $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                        }
                                    }
                                    }
                                ],
                                as: "emotions"
                            }
                        },
                        {
                            $sort: {
                              'createdAt': 1,
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                messages_content: 1,
                                sender_id: 1,
                                receiver_id: 1,
                                file_name: 1,
                                emotions: "$emotions.emotion"
                            }
                        }
                ])
                    _io.sockets.in(receiver).emit('server-send-mes', contentmes)
                }
            } catch (error) {
                console.error(error)
            }


        })

        // hiển thị danh sách bạn bè
        socket.on('client-list-friend', async (id) => {
            const friend = await _friend.find({
                $and: [
                    {
                        $or: [
                            {sender_id: id},
                            {receiver_id: id}
                        ]
                    },
                    {status: 'bạn bè'}
                ]
            })
            const result = friend.map(item => {
                if(item.sender_id===id){
                    return item.receiver_id
                }else{
                    return item.sender_id
                }
            })
            const friends = await _user.find({_id: {$in: result}})
            socket.emit('server-list-friend', friends)
        })

        //tạo nhóm 
        socket.on('client-create-group', async (id, name) => {
            try {
                const check = await _group.findOne({name: name})
                if(check){
                    socket.emit('server-list-group', 'group đã có')
                }else{
                    const group = await _group.create({
                        name: name,
                        has_online_bool: true
                    })

                    await _groupMembers.create({
                        group_id: group.id,
                        user_id: id,
                        permission: 'quản trị viên',
                        is_online: true
                    })

                    const groupuser = await _groupMembers.aggregate([
                        {
                          $match: {
                            user_id: id
                          }
                        },
                        {
                          $lookup: {
                            from: "groups",
                            let: { groupID: "$group_id" },
                            pipeline: [
                                {
                                $match: {
                                    $expr: {
                                    $eq: [ "$$groupID", {$toString: "$_id"}  ]
                                    }
                                }
                                }
                            ],
                            as: 'group'
                          }
                        },
                        {
                            $unwind: "$group"
                        },
                        {
                          $project: {
                            _id: 1,
                            name: '$group.name',
                          }
                        }
                      ]);
                    socket.emit('server-list-group', groupuser)
                }
            } catch (error) {
                console.log(error)
            }
        })

        //hiển thị danh sách nhóm
        socket.on('client-list-group', async id => {
            try {
                const groupuser = await _groupMembers.aggregate([
                    {
                      $match: {
                        user_id: id
                      }
                    },
                    {
                      $lookup: {
                        from: "groups",
                        let: { groupID: "$group_id" },
                        pipeline: [
                            {
                            $match: {
                                $expr: {
                                $eq: [ "$$groupID", {$toString: "$_id"}  ]
                                }
                            }
                            }
                        ],
                        as: 'group'
                      }
                    },
                    {
                        $unwind: "$group"
                    },
                    {
                      $project: {
                        _id: 1,
                        name: '$group.name',
                      }
                    }
                  ]);
                  socket.emit('server-list-group', groupuser)
            } catch (error) {
                console.log(error)
            }
        })

        //chọn nhóm muốn nhắn tin
        socket.on('client-receivergroup',async (id, group)=>{
            try {
                const groupInfo = await _group.findOne({name: group})

                const result = await _message.aggregate([
                    {
                        $match:{
                            $and: [
                                {sender_id: id},
                                {group_id: groupInfo.id}
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: "emotions",
                            let: { messageId: "$_id" },
                            pipeline: [
                                {
                                $match: {
                                    $expr: {
                                    $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                    }
                                }
                                }
                            ],
                            as: "emotions"
                        }
                    },
                    {
                        $sort: {
                          'createdAt': 1,
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            messages_content: 1,
                            sender_id: 1,
                            group_id: 1,
                            file_name: 1,
                            emotions: "$emotions.emotion"
                        }
                    }
            ])
            await socket.join(group)
            const group_member = await _groupMembers.find({user_id: id})
            if(group_member){
                var arrgroup_id = []
                for(var i=0; i<group_member.length; i++){
                    arrgroup_id.push(group_member[i].group_id)
                }
                const group_name = await _group.find({_id: {$in: arrgroup_id}})
                for(var i=0; i<group_name.length; i++){
                    if(group_name[i].name!=group){
                        socket.leave(group_name[i].name);
                    }
                }
            }
            socket.emit('server-mes-group', group, result)
            } catch (error) {
                console.log(error)
            }
            
        })

        //gửi lời mời kết bạn
        socket.on('client-create-friend', async (sender, receiver) => {
            try {
                const userreceiver = await _user.findOne({name: receiver})
                const check = await _friend.findOne({
                    $or:[
                        {sender_id: sender, receiver_id: userreceiver.id},
                        {receiver_id: sender, sender_id: userreceiver.id}
                    ]
                })
                if(!check){
                    await _friend.create({
                        sender_id: sender,
                        receiver_id: userreceiver.id,
                        status: 'đang xác thực'
                    })
                }
                const list_online = await _user.find({is_online: true})


                const friend = await _friend.find()
                
                var friend_id = []
                for (const item of friend) {
                    friend_id.push(
                        {
                            sender_id: item.sender_id,
                            receiver_id: item.receiver_id
                        }
                    )
                    
                }
                //hiển thị danh sách những người online
                socket.emit('server-list-online', list_online, friend_id)
            } catch (error) {
                console.log(error)
            }
        })

        //gửi cảm xúc
        socket.on('client-send-emotion', async (emotion, receiver, id, userid)=>{
            try {
                
                const check = await _emotion.findOne({
                    $and: [
                    { user_id:userid },
                    { message_id: id },
                ]})
                if(check){
                    await _emotion.updateOne({user_id: userid, message_id: id}, {emotion: emotion})
                }else{
                    await _emotion.create({
                        user_id: userid,
                        message_id: id,
                        emotion: emotion
                    })
                }
                const userreceiver = await _user.findOne({name: receiver})
                const groupreceiver = await _group.findOne({name: receiver})
                var checkuser
                var checkgroup
                if(userreceiver){
                    checkuser = await _message.findOne({
                        $or: [
                            { sender_id: userid, receiver_id: userreceiver.id },
                            { receiver_id: userid, sender_id: userreceiver.id }
                            ]
                    })
                }
                if(groupreceiver){
                    checkgroup = await _message.findOne({sender_id: userid, group_id:groupreceiver.id})
                }
                if(checkuser){
                    const contentmes = await _message.aggregate([
                        {
                            $match:{
                                $or: [
                                    { sender_id: userid, receiver_id: userreceiver.id },
                                    { receiver_id: userid, sender_id: userreceiver.id }
                                    ]
                            }
                        },
                        {
                            $lookup: {
                                from: "emotions",
                                let: { messageId: "$_id" },
                                pipeline: [
                                    {
                                    $match: {
                                        $expr: {
                                        $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                        }
                                    }
                                    }
                                ],
                                as: "emotions"
                            }
                        },
                        {
                            $sort: {
                              'updatedAt': 1,
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                messages_content: 1,
                                sender_id: 1,
                                receiver_id: 1,
                                file_name: 1,
                                emotions: "$emotions.emotion"
                            }
                        }
                ])
                const user1 = await _user.findOne({id: contentmes.sender_id})
                const user2 = await _user.findOne({id: contentmes.receiver_id})
                _io.to(user1.socketId).emit('server-send-mes', contentmes)
                _io.to(user2.socketId).emit('server-send-mes', contentmes)  
                }
                if(checkgroup){
                    const contentmes = await _message.aggregate([
                        {
                            $match:{
                                $and: [
                                    {sender_id: userid},
                                    {group_id: groupreceiver.id}
                                ]
                            }
                        },
                        {
                            $lookup: {
                                from: "emotions",
                                let: { messageId: "$_id" },
                                pipeline: [
                                    {
                                    $match: {
                                        $expr: {
                                        $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                        }
                                    }
                                    }
                                ],
                                as: "emotions"
                            }
                        },
                        {
                            $sort: {
                              'createdAt': 1,
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                messages_content: 1,
                                sender_id: 1,
                                group_id: 1,
                                file_name: 1,
                                emotions: "$emotions.emotion"
                            }
                        }
                ])
                _io.to(receiver).emit('server-mes-group', receiver, contentmes)
                }
            } catch (error) {
                console.log(error)
            }
        })

        //gửi ảnh
        socket.on('client-send-image', async (image, sender, receiver)=>{
            try {
                const userreceiver = await _user.findOne({name: receiver})
                const groupreceiver = await _group.findOne({name: receiver})
                var checkuser
                var checkgroup
                if(userreceiver){
                    checkuser = await _message.findOne({
                        $or: [
                            { sender_id: sender, receiver_id: userreceiver.id },
                            { receiver_id: sender, sender_id: userreceiver.id }
                            ]
                    })
                }
                if(groupreceiver){
                    checkgroup = await _message.findOne({sender_id: sender, group_id:groupreceiver.id})
                }
                if(checkuser){
                    await _message.create({
                        sender_id: sender,
                        receiver_id: userreceiver.id,
                        file_name: image
                    })
                    const contentmes = await _message.aggregate([
                        {
                            $match:{
                                $or: [
                                { sender_id: sender, receiver_id: userreceiver.id },
                                { receiver_id: sender, sender_id: userreceiver.id }
                                ]
                            }
                        },
                        {
                            $lookup: {
                                from: "emotions",
                                let: { messageId: "$_id" },
                                pipeline: [
                                    {
                                    $match: {
                                        $expr: {
                                        $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                        }
                                    }
                                    }
                                ],
                                as: "emotions"
                            }
                        },
                        {
                            $sort: {
                              'createdAt': 1,
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                messages_content: 1,
                                sender_id: 1,
                                receiver_id: 1,
                                file_name: 1,
                                emotions: "$emotions.emotion"
                            }
                        }
                ])
                    _io.to(userreceiver.socketId).emit('server-send-mes', contentmes)
                    socket.emit('server-send-mes', contentmes)
                }
                if(checkgroup){
                    await _message.create({
                        sender_id: sender,
                        group_id: groupreceiver.id,
                        file_name: image
                    })
                    const contentmes = await _message.aggregate([
                        {
                            $match:{sender_id: sender, group_id:groupreceiver.id}
                        },
                        {
                            $lookup: {
                                from: "emotions",
                                let: { messageId: "$_id" },
                                pipeline: [
                                    {
                                    $match: {
                                        $expr: {
                                        $eq: [ "$$messageId", { $toObjectId: "$message_id" } ]
                                        }
                                    }
                                    }
                                ],
                                as: "emotions"
                            }
                        },
                        {
                            $sort: {
                              'createdAt': 1,
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                messages_content: 1,
                                sender_id: 1,
                                receiver_id: 1,
                                file_name: 1,
                                emotions: "$emotions.emotion"
                            }
                        }
                ])
                _io.sockets.in(receiver).emit('server-send-mes', contentmes)
                }
            } catch (error) {
                console.error(error)
            }
        })

        //list lời mời
        socket.on('client-list-invitation', async id => {
            const friend = await _friend.find({
                $and: [
                    {sender_id: id},
                    {status: 'đang xác thực'}
                ]
            })
            const result = friend.map(item => {
                return item.receiver_id
            })
            const invitation = await _user.find({_id: {$in: result}})

            socket.emit('server-list-invitation', invitation)
        })

        //list gửi lời mời
        socket.on('client-list-sendinvitation', async id => {
            const friend = await _friend.find({
                $and: [
                    {receiver_id: id},
                    {status: 'đang xác thực'}
                ]
            })
            const result = friend.map(item => {
                return item.sender_id
            })
            const sendinvitation = await _user.find({_id: {$in: result}})
            socket.emit('server-list-sendinvitation', sendinvitation)
        })

        //chấp nhận kết bạn
        socket.on('client-accept', async (senderid, receivername) => {
            const receiver = await _user.findOne({name: receivername})
            await _friend.updateOne({sender_id: senderid, receiver_id: receiver.id}, {status: 'bạn bè'})
           const friend = await _friend.find({
            $and: [
                {sender_id: id},
                {status: 'đang xác thực'}
            ]
            })
            const result = friend.map(item => {
                return item.receiver_id
            })
            const invitation = await _user.find({_id: {$in: result}})

            socket.emit('server-list-invitation', invitation)
        })

        //không chấp nhận kết bạn
        socket.on('client-cancel', async (senderid, receivername) => {
            console.log(senderid)
            const receiver = await _user.findOne({name: receivername})
            await _friend.deleteOne({
                $or: [
                    {sender_id: senderid, receiver_id: receiver.id},
                    {receiver_id: senderid, sender_id: receiver.id},
                ]
            })
            const friend = await _friend.find({
                $and: [
                    {sender_id: id},
                    {status: 'đang xác thực'}
                ]
                })
                const result = friend.map(item => {
                    return item.receiver_id
                })
                const invitation = await _user.find({_id: {$in: result}})
    
                socket.emit('server-list-invitation', invitation)
        })

        //hiển thị thành viên
        socket.on('client-list-member-group', async (groupname, userid) => {
            try {
                const user = await _groupMembers.findOne({user_id: userid, permission: 'quản trị viên'})
                const group = await _group.findOne({name: groupname})
                const result = await _groupMembers.aggregate([
                    {
                        $match: {group_id: group.id}
                    },
                    {
                        $lookup: {
                            from: 'users',
                            let: {user_id: '$user_id'},
                            pipeline:[
                                {
                                    $match:{
                                        $expr:{
                                            $eq:['$_id', {$toObjectId: '$$user_id'}]
                                        }
                                    }
                                }
                            ],
                            as:'users'
                        }
                    },
                    {
                        $unwind: '$users'
                    },
                    {
                        $sort: {
                            'createdAt': 1
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            permission: 1,
                            membername: '$users.name',
                        }
                    }
                ])
                socket.emit('client-member-group', result, user)
            } catch (error) {
                console.log(error)
            }
        })

        //thăng quản trị viên
        socket.on('client-promote-member', async(groupname, membername, userid)=>{
            try {
                const user = await _groupMembers.findOne({user_id: userid, permission: 'quản trị viên'})
                const group = await _group.findOne({name: groupname})
                const usermember = await _user.findOne({name: membername})
                const check = await _groupMembers.findOne({group_id: group.id, user_id: usermember.id, permission: 'quản trị viên'})
                if(!check){
                    await _groupMembers.updateOne({group_id: group.id, user_id: usermember.id}, {permission: 'quản trị viên'})
                }
                const result = await _groupMembers.aggregate([
                    {
                        $match: {group_id: group.id}
                    },
                    {
                        $lookup: {
                            from: 'users',
                            let: {user_id: '$user_id'},
                            pipeline:[
                                {
                                    $match:{
                                        $expr:{
                                            $eq:['$_id', {$toObjectId: '$$user_id'}]
                                        }
                                    }
                                }
                            ],
                            as:'users'
                        }
                    },
                    {
                        $unwind: '$users'
                    },
                    {
                        $sort: {
                            'createdAt': 1
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            permission: 1,
                            membername: '$users.name',
                        }
                    }
                ])
                socket.emit('client-member-group', result, user)
            } catch (error) {
                console.log(error)
            }
        })

        //xóa thành viên
        socket.on('client-delete-member', async(groupname, membername, userid)=>{
            try {
                const user = await _groupMembers.findOne({user_id: userid, permission: 'quản trị viên'})
                const group = await _group.findOne({name: groupname})
                const usermember = await _user.findOne({name: membername})
                const check = await _groupMembers.findOne({group_id: group.id, user_id: usermember.id})
                if(check){
                    await _groupMembers.deleteOne({group_id: group.id, user_id: usermember.id})
                }
                const result = await _groupMembers.aggregate([
                    {
                        $match: {group_id: group.id}
                    },
                    {
                        $lookup: {
                            from: 'users',
                            let: {user_id: '$user_id'},
                            pipeline:[
                                {
                                    $match:{
                                        $expr:{
                                            $eq:['$_id', {$toObjectId: '$$user_id'}]
                                        }
                                    }
                                }
                            ],
                            as:'users'
                        }
                    },
                    {
                        $unwind: '$users'
                    },
                    {
                        $sort: {
                            'createdAt': 1
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            permission: 1,
                            membername: '$users.name',
                        }
                    }
                ])
                socket.emit('client-member-group', result, user)
            } catch (error) {
                console.log(error)
            }
        })

        //rời nhóm
        socket.on('client-out-group', async(groupname, membername)=>{
            try {
                const group = await _group.findOne({name: groupname})
                const usermember = await _user.findOne({name: membername})
                const check = await _groupMembers.findOne({group_id: group.id, user_id: usermember.id})
                if(!check){
                    await _groupMembers.deleteOne({group_id: group.id, user_id: usermember.id})
                }
                const quantiymember = await _groupMembers.find()
                if(!quantiymember){
                    await _group.deleteOne({name: groupname})
                }
                const list_online = await _user.find({is_online: true})
                const friend = await _friend.find()
                
                var friend_id = []
                for (const item of friend) {
                    friend_id.push(
                        {
                            sender_id: item.sender_id,
                            receiver_id: item.receiver_id
                        }
                    )
                    
                }
                //hiển thị danh sách những người online
                socket.emit('server-list-online', list_online, friend_id)
            } catch (error) {
                console.log(error)
            }
        })

        //thêm thành viên nhóm membername lay theo ten
        socket.on('client-more-member', async(groupname, membername, userid)=>{
            try {
                const user = await _groupMembers.findOne({user_id: userid, permission: 'quản trị viên'})
                const group = await _group.findOne({name: groupname})
                const usermember = await _user.findOne({name: membername})
                if(usermember){
                    const check = await _groupMembers.findOne({group_id: group.id, user_id: usermember.id})
                    if(!check){
                        await _groupMembers.create({
                            group_id: group.id,
                            user_id: usermember.id,
                            permission: 'member',
                            is_online: true
                        })
                    }
                }
                const result = await _groupMembers.aggregate([
                    {
                        $match: {group_id: group.id}
                    },
                    {
                        $lookup: {
                            from: 'users',
                            let: {user_id: '$user_id'},
                            pipeline:[
                                {
                                    $match:{
                                        $expr:{
                                            $eq:['$_id', {$toObjectId: '$$user_id'}]
                                        }
                                    }
                                }
                            ],
                            as:'users'
                        }
                    },
                    {
                        $unwind: '$users'
                    },
                    {
                        $sort: {
                            'createdAt': 1
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            permission: 1,
                            membername: '$users.name',
                        }
                    }
                ])
                socket.emit('client-member-group', result, user)
            } catch (error) {
                console.log(error)
            }
        })

        //khi người dùng off line
        socket.on('disconnect', async () => {
            console.log('có người ngắt kết nối: ' + socket.id);
            await _user.updateOne({ _id: id }, { $set: { is_online: false } });
            await _groupMembers.updateMany({ user_id: id }, { $set: { is_online: false } });
        });
    }
}

module.exports = new SocketService;